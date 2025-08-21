import { Plugin, TFolder, TFile, Notice, EventRef } from 'obsidian';
import * as path from 'path';
import CredentialTab from './src/credential';
import SFTPClient from './src/client';

interface SyncFTPSettings {
	url: string;
	port: number;
	proxy_host: string;
	proxy_port: number;
	username: string;
	password: string;
	vault_path: string;
	notify: boolean;
	load_sync: boolean;
	live_enabled: boolean;
	live_on_change: boolean;
	live_interval_sec: number;
}

const DEFAULT_SETTINGS: SyncFTPSettings = {
	url: '',
	port: 22,
	proxy_host: '',
	proxy_port: 22,
	username: '',
	password: '',
	vault_path: '/obsidian/',
	notify: false,
	load_sync: false,
	live_enabled: false,
	live_on_change: true,
	live_interval_sec: 0
}

export default class SyncFTP extends Plugin {
	settings: SyncFTPSettings;
	client: SFTPClient;
	private liveChangeDebounce?: number;
	private liveEventRefs: EventRef[] = [];
	private liveIntervalId: number | null = null;
	private settingsTabAdded: boolean = false;

	async onload() {
		await this.loadSettings();

		this.client = new SFTPClient();

		if (this.settings.load_sync) {
			this.downloadFile();
		}

		this.addCommand({
	      id: "push-to-sftp",
	      name: "Upload files to the SFTP",
	      callback: () => { this.uploadFile(); },
	    });

	    this.addCommand({
	      id: "pull-from-sftp",
	      name: "Download files from the SFTP",
	      callback: () => { this.downloadFile(); },
	    });

		const syncUpload = this.addRibbonIcon(
			'arrow-up',
			'Upload to FTP',
			() => { this.uploadFile(); });

		const syncDownload = this.addRibbonIcon(
			'arrow-down',
			'Download from FTP',
			() => { this.downloadFile(); });

		if (!this.settingsTabAdded) {
			this.addSettingTab(new CredentialTab(this.app, this));
			this.settingsTabAdded = true;
		}

		this.setupLiveSync();
	}

	async onunload() {
		this.teardownLiveSync();
		await this.saveSettings();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private teardownLiveSync() {
		if (this.liveIntervalId !== null) {
			window.clearInterval(this.liveIntervalId);
			this.liveIntervalId = null;
		}
		for (const ref of this.liveEventRefs) {
			// @ts-ignore Obsidian API provides offref
			this.app.vault.offref(ref);
		}
		this.liveEventRefs = [];
		if (this.liveChangeDebounce) {
			window.clearTimeout(this.liveChangeDebounce);
			this.liveChangeDebounce = undefined;
		}
	}

	setupLiveSync() {
		this.teardownLiveSync();
		if (!this.settings.live_enabled) return;

		if (this.settings.live_on_change) {
			const triggerUpload = () => {
				if (this.liveChangeDebounce) {
					window.clearTimeout(this.liveChangeDebounce);
				}
				this.liveChangeDebounce = window.setTimeout(() => {
					this.uploadFile({ isAuto: true });
				}, 3000);
			};

			const ref1 = this.app.vault.on('modify', (_file: any) => { triggerUpload(); });
			const ref2 = this.app.vault.on('create', (_file: any) => { triggerUpload(); });
			const ref3 = this.app.vault.on('delete', (_file: any) => { triggerUpload(); });
			const ref4 = this.app.vault.on('rename', (_file: any, _oldPath: string) => { triggerUpload(); });
			this.liveEventRefs.push(ref1, ref2, ref3, ref4);
			this.registerEvent(ref1);
			this.registerEvent(ref2);
			this.registerEvent(ref3);
			this.registerEvent(ref4);
		}

		if (this.settings.live_interval_sec && this.settings.live_interval_sec > 0) {
			this.liveIntervalId = window.setInterval(() => { this.uploadFile({ isAuto: true }); }, this.settings.live_interval_sec * 1000);
			this.registerInterval(this.liveIntervalId);
		}
	}

	async uploadFile(options?: { isAuto?: boolean }) {
		if (this.settings.url !== '') {
			if (!(options?.isAuto && !this.settings.notify)) {
				new Notice(`Connecting to SFTP for file sync:\n${this.settings.url}:${this.settings.port}\n${this.settings.username}`);
			}
			try {
				let conn = await this.client.connect({
					proxy_host: this.settings.proxy_host,
					proxy_port: Number(this.settings.proxy_port),
					host: this.settings.url,
					port: Number(this.settings.port),
					username: this.settings.username,
					password: this.settings.password
				});

				if (this.settings.notify) new Notice(conn);

				if (await this.client.fileExists(this.settings.vault_path) === false) {
					await this.client.makeDir(this.settings.vault_path);
				}

				if (await this.client.fileExists(`${this.settings.vault_path}${this.app.vault.getName()}/`) === false) {
					await this.client.makeDir(`${this.settings.vault_path}${this.app.vault.getName()}/`);
				}

				let rem_path = this.settings.vault_path + this.app.vault.getName();
				let rem_list = await this.client.listFiles(rem_path);
				const adapter: any = this.app.vault.adapter;
				let loc_path = typeof adapter.getBasePath === 'function' ? adapter.getBasePath() : adapter.basePath;
				let loc_list = this.app.vault.getAllLoadedFiles();
				loc_list.splice(0, 1);

				for (const rem_file of rem_list) {
					let match_index = loc_list.findIndex((file: any) => `/${file.path}` === `${rem_file.path.replace(rem_path, '')}/${rem_file.name}`);
					let match = loc_list[match_index];

					try {
						if (match) {
							if (rem_file.type === 'd' || (match instanceof TFile && rem_file.size === match.stat.size)) {
								loc_list.splice(match_index, 1);
							}
						} else if (!match) {
							let sync = '';
							if (rem_file.type === 'd') {
								if (await this.client.fileExists(`${rem_file.path}/${rem_file.name}`)) {
									sync = await this.client.removeDir(`${rem_file.path}/${rem_file.name}`);
								}
							} else {
								if (await this.client.fileExists(`${rem_file.path}/${rem_file.name}`)) {
									sync = await this.client.deleteFile(`${rem_file.path}/${rem_file.name}`);
								}
							}

							if (this.settings.notify && sync.trim() != '') new Notice(sync);
						}
					} catch (err) {
						console.error(`Error deleting ${rem_file.name}: ${err}`);
					}

				}

				for (const loc_file of loc_list) {
					let sync = '';
					if (loc_file instanceof TFolder) {
						sync = await this.client.makeDir(`${rem_path}/${loc_file.path}`);
					} else if (loc_file instanceof TFile) {
						sync = await this.client.uploadFile(`${loc_path}/${loc_file.path}`, `${rem_path}/${loc_file.path}`);
					}

					if (this.settings.notify && sync.trim() != '') new Notice(sync);
				}

				let disconn = await this.client.disconnect();

				if (options?.isAuto && !this.settings.notify) {
					// suppress success notice during auto sync when notify is false
				} else {
					if (this.settings.notify) new Notice(disconn);
					else new Notice('Done!');
				}
			} catch (err) {
				new Notice(`Failed to connect to SFTP: ${err}`);
			}
		}
	}

	async downloadFile(options?: { isAuto?: boolean }) {
		if (this.settings.url !== '') {
			if (!(options?.isAuto && !this.settings.notify)) {
				new Notice(`Connecting to SFTP for file sync:\n${this.settings.url}:${this.settings.port}\n${this.settings.username}`);
			}
			try {
				let conn = await this.client.connect({
					proxy_host: this.settings.proxy_host,
					proxy_port: Number(this.settings.proxy_port),
					host: this.settings.url,
					port: Number(this.settings.port),
					username: this.settings.username,
					password: this.settings.password
				});

				if (this.settings.notify) new Notice(conn);
				console.log(this.client.fileExists(this.settings.vault_path + this.app.vault.getName()));

				if (! await this.client.fileExists(this.settings.vault_path + this.app.vault.getName())) {
					new Notice('Vault does not exist on SFTP, nothing to download. Please upload.');
				} else {
					let rem_path = this.settings.vault_path + this.app.vault.getName();
					let rem_list = await this.client.listFiles(rem_path);
					const adapter2: any = this.app.vault.adapter;
					let loc_path = typeof adapter2.getBasePath === 'function' ? adapter2.getBasePath() : adapter2.basePath;
					let loc_list = this.app.vault.getAllLoadedFiles();
					loc_list.splice(0, 1);

					for (const loc_file of loc_list) {
						let match_index = rem_list.findIndex((file: any) => `${file.path.replace(rem_path, '')}/${file.name}` === `/${loc_file.path}`);
						let match = rem_list[match_index];

						try {
							let sync = '';
							if (match) {
								if (match.type === 'd' || (loc_file instanceof TFile && match.size === (loc_file as TFile).stat.size)) {
									rem_list.splice(match_index, 1);
								}
							} else if (!match && loc_file.path !== '/') {
								await this.app.vault.trash(loc_file, false);
								sync = `Local file ${loc_file.name} moved to Obsidian trash.`;
							}

							if (this.settings.notify && sync.trim() != '') new Notice(sync);
						} catch (err) {
							console.error(`Error moving ${loc_file.name} to trash: ${err}`);
						}
					}

					for (const rem_file of rem_list) {
						let sync = '';
						let dst_path = '';
						if (rem_file.path !== rem_path) {
							const trimmed = rem_file.path.startsWith(rem_path + '/') ? rem_file.path.substring(rem_path.length + 1) : rem_file.path.replace(rem_path, '').replace(/^\/+/, '');
							dst_path = trimmed.length > 0 ? trimmed + '/' : '';
						}

						if (rem_file.type !== 'd') {
							sync = await this.client.downloadFile(`${rem_file.path}/${rem_file.name}`, path.join(loc_path, dst_path, rem_file.name));
						} else {
							if (!loc_list.find(folder => folder.name === rem_file.name)) {
								const localFolderRel = `${dst_path}${rem_file.name}/`;
								try {
									await this.app.vault.createFolder(localFolderRel);
								} catch (e) {}
								sync = `Successfully made directory: ${rem_file.name}`;
							}
						}

						if (this.settings.notify && sync.trim() != '') new Notice(sync);
					};
				}

				let disconn = await this.client.disconnect();

				if (this.settings.notify) new Notice(disconn);
				else new Notice('Done!');
			} catch (err) {
				new Notice(`Failed to connect to SFTP: ${err}`);
			}
		}
	}
}