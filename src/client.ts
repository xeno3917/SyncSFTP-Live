import SFTPClientLib from 'ssh2-sftp-client';
import { SocksClient, SocksClientOptions, SocksProxy } from 'socks';

type SFTPConnectOptions = {
  host: string;
  port: number;
  username: string;
  password: string;
  proxy_host?: string;
  proxy_port?: number;
};

type RemoteFileInfo = {
  name: string;
  mtime: number;
  type: string;
  size: number;
  path: string;
};

export default class SFTPClient {
  private client: SFTPClientLib;

  constructor() {
    this.client = new SFTPClientLib();
  }

  async connect(options: SFTPConnectOptions): Promise<void> {
    console.log(`Connecting to ${options.host}:${options.port}`);
    try {
      if (options.proxy_host && options.proxy_host !== '') {
        const opt: SocksClientOptions = {
          proxy: {
            host: options.proxy_host,
            port: options.proxy_port as number,
            type: 5,
          } as SocksProxy,
          command: 'connect',
          destination: {
            host: options.host,
            port: options.port
          }
        };

        var socks = await SocksClient.createConnection(opt);

        await this.client.connect({
          host: options.host,
          port: options.port,
          sock: socks.socket,
          username: options.username,
          password: options.password
        });
      } else {
        await this.client.connect({
          host: options.host,
          port: options.port,
          username: options.username,
          password: options.password
        });
      }
    } catch (err) {
      console.log('Failed to connect:', err);
      throw new Error(`Failed to connect: ${err}`);
    }
    return;
  }

  async disconnect(): Promise<string> {
    console.log(`Disconnecting from SFTP.`);
    await this.client.end();
    return 'Disconnected from SFTP';
  }

  async listFiles(remoteDir: string, fileGlob?: string): Promise<RemoteFileInfo[]> {
    let fileObjects: any[] = [];
    try {
      if (fileGlob) {
        // @ts-ignore - second arg can be glob or filter function
        fileObjects = await this.client.list(remoteDir, fileGlob as any);
      } else {
        fileObjects = await this.client.list(remoteDir);
      }
    } catch (err) {
      console.log('Listing failed:', err);
    }

    var fileNames: RemoteFileInfo[] = [];

    for (const file of fileObjects) {
      if (file.type === 'd') {
        console.log(`${new Date(file.modifyTime).toISOString()} PRE ${file.name}`);
        fileNames.push({
          name: file.name,
          mtime: file.modifyTime,
          type: file.type,
          size: file.size,
          path: remoteDir
        });
        
        let subFiles = await this.listFiles(`${remoteDir}/${file.name}`);
        fileNames = fileNames.concat(subFiles);
      } else {
        console.log(`${new Date(file.modifyTime).toISOString()} ${file.size} ${file.name}`);
        fileNames.push({
          name: file.name,
          mtime: file.modifyTime,
          type: file.type,
          size: file.size,
          path: remoteDir
        });
      }      
    }

    return fileNames;
  }

  async uploadFile(localFile: string, remoteFile: string): Promise<string> {
    console.log(`Uploading ${localFile} to ${remoteFile}`);
    try {
      await this.client.put(localFile, remoteFile);
    } catch (err) {
      console.error('Uploading failed:', err);
      return(`Uploading failed:\n${err}`);
    }
    return `Uploading success for\n${localFile}`;
  }

  async downloadFile(remoteFile: string, localFile: string): Promise<string> {
    console.log(`Downloading ${remoteFile} to ${localFile}`);
    try {
      await this.client.get(remoteFile, localFile);
    } catch (err) {
      console.error('Downloading failed:', err);
      return(`Downloading failed:\n${err}`);
    }
    return `Downloading success for\n${localFile}`;
  }

  async makeDir(remoteDir: string): Promise<string> {
    console.log(`Creating directory ${remoteDir}`);
    try {
      await this.client.mkdir(remoteDir, true);
    } catch (err) {
      console.error('Failed to create directory:', err);
      return(`Failed to make directory:\n${err}`);
    }
    return `Successfully made directory:\n${remoteDir}`;
  }

  async removeDir(remoteDir: string): Promise<string> {
    console.log(`Deleting directory ${remoteDir}`);
    try {
      await this.client.rmdir(remoteDir, true);
    } catch (err) {
      console.error('Failed to remove directory:', err);
      return(`Failed to remove directory:\n${err}`);
    }
    return `Successfully removed directory:\n${remoteDir}`;

  }

  async deleteFile(remoteFile: string): Promise<string> {
    console.log(`Deleting ${remoteFile}`);
    try {
      await this.client.delete(remoteFile);
    } catch (err) {
      console.error('Deleting failed:', err);
      return(`Deleting failed:\n${err}`);
    }
    return `Delete success for\n${remoteFile}`;
  }

  async fileExists(remoteFile: string): Promise<boolean> {
    console.log(`Checking if ${remoteFile} exists`);
    let exists: any = false;
    try {
      exists = await this.client.exists(remoteFile);
    } catch (err) {
      console.error('Exists check failed:', err);
    }
    return Boolean(exists);
  }
}