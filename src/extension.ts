import { renderPrompt } from '@vscode/prompt-tsx';
import * as vscode from 'vscode';
import { Prompt, PromptProps } from './play';
import { VsCodeFS } from './utils';
import fs from 'fs';

const FRIDAY_NAMES_COMMAND_ID = 'friday.namesInEditor';
const FRIDAY_PARTICIPANT_ID = 'copilot.friday';

interface IFridayChatResult extends vscode.ChatResult {
	metadata: {
		command: string;
	};
}

interface CommandItem {
	name: string;
	description: string;
}

// Use gpt-4o since it is fast and high quality. gpt-3.5-turbo and gpt-4 are also available.
const MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
	vendor: 'copilot',
	family: 'gpt-4o',
};

export function activate(context: vscode.ExtensionContext) {
	const handler: vscode.ChatRequestHandler = async (
		request: vscode.ChatRequest,
		context: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<IFridayChatResult> => {
		// To talk to an LLM in your subcommand handler implementation, your
		// extension can use VS Code's `requestChatAccess` API to access the Copilot API.
		// The GitHub Copilot Chat extension implements this provider.

		if (request.command) {
			let references: PromptProps['references'] = [];
			if (request.references?.length > 0) {
				for (const reference of request.references) {
					if (reference.value instanceof vscode.Uri) {
						stream.reference(reference.value);

						const languageId = await VsCodeFS.getLanguageId(
							reference.value.fsPath
						);
						const content = await VsCodeFS.readFileOrOpenDocumentContent(
							reference.value.fsPath,
							'utf-8'
						);
						references.push({
							fileName: (reference as any).name,
							languageId,
							content,
						});
					}
				}
			} else {
				// get current editor content
				const editor = vscode.window.activeTextEditor;
				if (editor) {
					const languageId = editor.document.languageId;
					const content = editor.document.getText();
					const fileNameWithoutPath = editor.document.fileName.split(/\/|\\/).pop();
					references.push({
						fileName: fileNameWithoutPath!,
						languageId,
						content,
					});
				}
			}

			if (request.command === 'custom') {
				stream.progress('Thinking ...');
				const command = request.prompt.match(/(?<=\/)\w+/)?.[0] || '';

				if (command === '') {
					stream.markdown(
						'Please provide a command to execute. For example, `/refactor_function`.'
					);
					return { metadata: { command: '' } };
				}

				try {
					// To get a list of all available models, do not pass any selector to the selectChatModels.
					const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
					if (model) {
						const { messages } = await renderPrompt(
							Prompt,
							{
								command: command,
								userQuery: request.prompt.replace(`/${command}`, '').trim(),
								references: references,
							},
							{ modelMaxPromptTokens: model.maxInputTokens },
							model
						);

						const chatResponse = await model.sendRequest(messages, {}, token);
						for await (const fragment of chatResponse.text) {
							stream.markdown(fragment);
						}
					}
				} catch (err) {
					handleError(logger, err, stream);
				}

				// stream.button({
				// 	command: CAT_NAMES_COMMAND_ID,
				// 	title: vscode.l10n.t('Use Cat Names in Editor'),
				// });

				logger.logUsage('request', { kind: command });
				return { metadata: { command: command } };
			}

			stream.progress('Refactoring the code ...');

			try {
				const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
				if (model) {
					// Here's an example of how to use the prompt-tsx library to build a prompt
					const { messages } = await renderPrompt(
						Prompt,
						{
							command: request.command,
							userQuery: request.prompt,
							references: references,
						},
						{ modelMaxPromptTokens: model.maxInputTokens },
						model
					);

					const chatResponse = await model.sendRequest(messages, {}, token);
					for await (const fragment of chatResponse.text) {
						stream.markdown(fragment);
					}
				}
			} catch (err) {
				handleError(logger, err, stream);
			}

			logger.logUsage('request', { kind: request.command });
			return { metadata: { command: request.command } };
		} else {
			try {
				const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
				if (model) {
					const messages = [vscode.LanguageModelChatMessage.User(request.prompt)];

					const chatResponse = await model.sendRequest(messages, {}, token);
					for await (const fragment of chatResponse.text) {
						// Process the output from the language model
						stream.markdown(fragment);
					}
				}
			} catch (err) {
				handleError(logger, err, stream);
			}

			logger.logUsage('request', { kind: '' });
			return { metadata: { command: '' } };
		}
	};

	// Chat participants appear as top-level options in the chat input
	// when you type `@`, and can contribute sub-commands in the chat input
	// that appear when you type `/`.
	const friday = vscode.chat.createChatParticipant(FRIDAY_PARTICIPANT_ID, handler);
	friday.iconPath = vscode.Uri.joinPath(context.extensionUri, 'avatar.jpg');
	// friday.followupProvider = {
	// 	provideFollowups(
	// 		result: IFridayChatResult,
	// 		context: vscode.ChatContext,
	// 		token: vscode.CancellationToken
	// 	) {
	// 		return [
	// 			{
	// 				prompt: 'let us play',
	// 				label: vscode.l10n.t('Play with the cat'),
	// 				command: 'play',
	// 			} satisfies vscode.ChatFollowup,
	// 		];
	// 	},
	// };

	const logger = vscode.env.createTelemetryLogger({
		sendEventData(eventName, data) {
			// Capture event telemetry
			console.log(`Event: ${eventName}`);
			console.log(`Data: ${JSON.stringify(data)}`);
		},
		sendErrorData(error, data) {
			// Capture error telemetry
			console.error(`Error: ${error}`);
			console.error(`Data: ${JSON.stringify(data)}`);
		},
	});

	context.subscriptions.push(
		friday.onDidReceiveFeedback((feedback: vscode.ChatResultFeedback) => {
			// Log chat result feedback to be able to compute the success matric of the participant
			// unhelpful / totalRequests is a good success metric
			logger.logUsage('chatResultFeedback', {
				kind: feedback.kind,
			});
		})
	);

	context.subscriptions.push(
		friday,
		// Register the command handler for the /meow followup
		vscode.commands.registerTextEditorCommand(
			FRIDAY_NAMES_COMMAND_ID,
			async (textEditor: vscode.TextEditor) => {
				const text = textEditor.document.getText();

				let chatResponse: vscode.LanguageModelChatResponse | undefined;
				try {
					const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
					if (!model) {
						console.log(
							'Model not found. Please make sure the GitHub Copilot Chat extension is installed and enabled.'
						);
						return;
					}

					const messages = [vscode.LanguageModelChatMessage.User(text)];
					chatResponse = await model.sendRequest(
						messages,
						{},
						new vscode.CancellationTokenSource().token
					);
				} catch (err) {
					if (err instanceof vscode.LanguageModelError) {
						console.log(err.message, err.code, err.cause);
					} else {
						throw err;
					}
					return;
				}

				// Clear the editor content before inserting new content
				await textEditor.edit((edit) => {
					const start = new vscode.Position(0, 0);
					const end = new vscode.Position(
						textEditor.document.lineCount - 1,
						textEditor.document.lineAt(
							textEditor.document.lineCount - 1
						).text.length
					);
					edit.delete(new vscode.Range(start, end));
				});

				// Stream the code into the editor as it is coming in from the Language Model
				try {
					for await (const fragment of chatResponse.text) {
						await textEditor.edit((edit) => {
							const lastLine = textEditor.document.lineAt(
								textEditor.document.lineCount - 1
							);
							const position = new vscode.Position(
								lastLine.lineNumber,
								lastLine.text.length
							);
							edit.insert(position, fragment);
						});
					}
				} catch (err) {
					// async response stream may fail, e.g network interruption or server side error
					await textEditor.edit((edit) => {
						const lastLine = textEditor.document.lineAt(
							textEditor.document.lineCount - 1
						);
						const position = new vscode.Position(
							lastLine.lineNumber,
							lastLine.text.length
						);
						edit.insert(position, (<Error>err).message);
					});
				}
			}
		)
	);

	const matchCommand = vscode.commands.registerCommand('friday.updateCommands', () => updateCommand(context));
	context.subscriptions.push(matchCommand);
}

function updateCommand(context: vscode.ExtensionContext) {
	const file = vscode.Uri.joinPath(context.extensionUri, 'package.json');

	const config = vscode.workspace.getConfiguration('friday.prompts');
	console.log('#config', config);

	// get the content of the file
	const content = fs.readFileSync(file.fsPath, 'utf-8');
	const json = JSON.parse(content);


	// update command
	const commands = json.contributes.chatParticipants[0].commands;
	const newCommands = Object.keys(config).map((key) => {
		if (typeof config[key] !== 'string') {
			return null;
		}
		return {
			name: key,
			description: config[key],
		};
	}).filter((item) => item !== null);

	newCommands.forEach((command: CommandItem) => {
		if (!commands.some((c: any) => {
			if (c.name === command.name) {
				c.description = command.description;
				return true;
			}
		})) {
			commands.push(command);
		}
	});

	console.log('commands', JSON.stringify(json, null, 2));

	// write the content back to the file
	fs.writeFileSync(file.fsPath, JSON.stringify(json, null, 2));
}

function handleError(
	logger: vscode.TelemetryLogger,
	err: any,
	stream: vscode.ChatResponseStream
): void {
	// making the chat request might fail because
	// - model does not exist
	// - user consent not given
	// - quote limits exceeded
	logger.logError(err);

	if (err instanceof vscode.LanguageModelError) {
		console.log(err.message, err.code, err.cause);
		if (err.cause instanceof Error && err.cause.message.includes('off_topic')) {
			stream.markdown(
				vscode.l10n.t("I'm sorry, I can only explain computer science concepts.")
			);
		}
	} else {
		// re-throw other errors so they show up in the UI
		throw err;
	}
}

export function deactivate() {}
