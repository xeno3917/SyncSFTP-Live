# SyncSFTPLive

This Obsidian.md plugin allows users to sync files to their personal SFTP server.

It's a fork from the original "SyncFTP", with bug correction and a new feature (Live Sync).

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
- Enable live sync toggle: Enable sync (auto-upload and/or interval) of modified content
- Upload on change toggle: Enable sync on change (don't use it with interval)
- Upload interval: force check and upload of modified content every X seconds (don't use it with on-change) 

If you would like to use a proxy, please fill in the settings:
- Proxy URL
- Proxy PORT

When you wish to sync you can either push or pull files to the SFTP using:
1. Icons (up and down arrow) on the left toolbar
2. Commands (CTRL-P), which will allow you to set a keyboard shortcut as desired
3. Enable upload on change (New features)

This process is destructive on the SFTP, and moves local files to your .trash folder.

### Support
If you have any questions or requests, please open a GitHub issue in this repository!

### License
This project is under the [MIT](https://en.wikipedia.org/wiki/MIT_License) license.
