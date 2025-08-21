import SyncFTP from '../main';
import { App, PluginSettingTab, Setting } from 'obsidian';

export default class CredentialTab extends PluginSettingTab {
	plugin: SyncFTP;

	constructor(app: App, plugin: SyncFTP) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', {text: 'SFTP Settings'});

		new Setting(containerEl)
			.setName('URL')
			.setDesc('SFTP URL')
			.addText((text: any) => text
				.setValue(this.plugin.settings.url)
				.onChange(async (value: string) => {
					this.plugin.settings.url = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Port')
			.setDesc('SFTP Port')
			.addText((text: any) => text
				.setValue(String(this.plugin.settings.port))
				.onChange(async (value: string) => {
					this.plugin.settings.port = Number(value) || 22;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', {text: 'If you are not using a proxy please leave these fields empty.'});

		new Setting(containerEl)
			.setName('Proxy URL')
			.setDesc('Proxy URL')
			.addText((text: any) => text
				.setValue(this.plugin.settings.proxy_host)
				.onChange(async (value: string) => {
					this.plugin.settings.proxy_host = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Proxy port')
			.addText((text: any) => text
				.setValue(String(this.plugin.settings.proxy_port))
				.onChange(async (value: string) => {
					this.plugin.settings.proxy_port = Number(value) || 22;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', {text: 'Credentials'});

		new Setting(containerEl)
			.setName('Username')
			.setDesc('SFTP Username')
			.addText((text: any) => text
				.setValue(this.plugin.settings.username)
				.onChange(async (value: string) => {
					this.plugin.settings.username = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Password')
			.setDesc('SFTP Password')
			.addText((text: any) => {
				text.inputEl.type = 'password';
				text
					.setValue(this.plugin.settings.password)
					.onChange(async (value: string) => {
						this.plugin.settings.password = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Vaults Path')
			.setDesc('SFTP Vaults Directory Path')
			.addText((text: any) => text
				.setValue(this.plugin.settings.vault_path)
				.onChange(async (value: string) => {
					this.plugin.settings.vault_path = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sync Notifications')
			.setDesc('Would you like to be notified of all SyncFTP actions? Necessary Notices will still populate.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.notify)
				.onChange(async (value: boolean) => {
					this.plugin.settings.notify = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sync on Load')
			.setDesc('Would you like to pull new changes from the SFTP every time you open Obsidian?')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.load_sync)
				.onChange(async (value: boolean) => {
					this.plugin.settings.load_sync = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', {text: 'Live sync'});

		new Setting(containerEl)
			.setName('Enable live sync')
			.setDesc('Enable background uploads automatically.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.live_enabled)
				.onChange(async (value: boolean) => {
					this.plugin.settings.live_enabled = value;
					await this.plugin.saveSettings();
					this.plugin.setupLiveSync();
				}));

		new Setting(containerEl)
			.setName('Upload on change')
			.setDesc('Debounced push a few seconds after edits, creates, deletes, or renames.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.live_on_change)
				.onChange(async (value: boolean) => {
					this.plugin.settings.live_on_change = value;
					await this.plugin.saveSettings();
					this.plugin.setupLiveSync();
				}));

		new Setting(containerEl)
			.setName('Upload interval (seconds)')
			.setDesc('If greater than 0, runs periodic uploads in addition to on-change if enabled.')
			.addText((text: any) => text
				.setValue(String(this.plugin.settings.live_interval_sec))
				.onChange(async (value: string) => {
					const num = Number(value);
					this.plugin.settings.live_interval_sec = isNaN(num) ? 0 : num;
					await this.plugin.saveSettings();
					this.plugin.setupLiveSync();
				}));
	}
}
