import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class StorelinkApi implements ICredentialType {
	name = 'storelinkApi';

	displayName = 'Storelink API';

	icon: Icon = { light: 'file:../icons/storelink.svg', dark: 'file:../icons/storelink.svg' };

	documentationUrl = 'https://github.com/microdotcompany/storelink-n8n-nodes#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: "Create one on the store's Settings > Integrations page in Storelink",
		},
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			default: 'https://dashboard.store.link',
			description: 'Leave this as it is unless Storelink support asks you to change it',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.serverUrl.replace(/\\/$/, "")}}/apps/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
