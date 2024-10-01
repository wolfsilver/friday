import {
	BasePromptElementProps,
	PromptElement,
	PromptSizing,
	UserMessage,
} from '@vscode/prompt-tsx';
import * as vscode from 'vscode';
import { PROMPTS } from './prompts';

// Define the properties for the prompt
export interface PromptProps extends BasePromptElementProps {
	command: string;
	userQuery: string;
	references?: {
		fileName: string;
		languageId: string;
		content: string;
	}[];
}

const ignoreKey = ['has', 'get', 'update', 'inspect'];

// Define the Prompt class
export class Prompt extends PromptElement<PromptProps, void> {
	private customConfigMap: Record<string, string> = {};

	constructor(props: PromptProps) {
		super(props);
		const config = vscode.workspace.getConfiguration('friday.prompts');
		console.log('#config', config);
		for (const key in config) {
			if (
				Object.prototype.hasOwnProperty.call(config, key) &&
				!ignoreKey.includes(key)
			) {
				const prompt = config[key];
				this.customConfigMap[key] = prompt;
			}
		}
	}

	render(state: void, sizing: PromptSizing) {
		const { command, userQuery, references } = this.props;

		const preDefinedPrompts =
			this.customConfigMap[command] || PROMPTS[command as keyof typeof PROMPTS];

		return (
			<>
				{preDefinedPrompts ? (
					<UserMessage>{preDefinedPrompts}</UserMessage>
				) : undefined}

				{userQuery ? <UserMessage>{userQuery}</UserMessage> : undefined}

				{references && references?.length > 0
					? references?.map((reference, index) => (
							<UserMessage>
								# {reference.fileName.toUpperCase()} CONTEXT
								<br />
								```{reference.languageId}
								<br />
								{reference.content}```
							</UserMessage>
					  ))
					: undefined}
			</>
		);
	}
}
