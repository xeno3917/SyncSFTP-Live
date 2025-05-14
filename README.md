# SyncFTP

This Obsidian.md plugin allows users to sync files to their personal FTP server.

This plugin depends on [ssh2-sftp-client](https://www.npmjs.com/package/ssh2-sftp-client) and [socks](https://www.npmjs.com/package/socks) to allow for secure file transfer. 

### Use
Once installed, an additional settings tab for SyncFTP will have been added. There you will need to provide:
- Host URL
- Host PORT
- Username
- Password
- Path to vault directory on SFTP: The vault directory will be the base directory for ALL vaults. 
- Notification toggle: Certain Notices will remain, but verbose information Notices will be disabled
- Download on open toggle: Allows you to download work from the SFTP on open.

If you would like to use a proxy, please fill in the settings:
- Proxy URL
- Proxy PORT

When you wish to sync you can either push or pull files to the SFTP using:
1. Icons (up and down arrow) on the left toolbar
2. Commands (CTRL-P), which will allow you to set a keyboard shortcut as desired

This process is destructive on the SFTP, and moves local files to your .trash folder.

### Support
I am no longer supporting this plugin.

### License
This project is under the [MIT](https://en.wikipedia.org/wiki/MIT_License) license.
