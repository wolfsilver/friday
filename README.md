# Friday AI Assistant

Friday AI Assistant is a VSCode plugin based on GitHub Copilot that helps you better utilize GitHub Copilot.
It provides prompts to make chatting more convenient.

## Usage
Use `@friday` to invoke the assistant, then select the desired command.

Custom Commands:
Add custom commands in `settings.json` with the following format:
```json
{
	"friday.prompts": {
			"refactor_function": "Refactor the following code to eliminate redundancy and improve maintainability by applying the DRY (Don't Repeat Yourself) principle. Identify repeated code patterns and abstract them into reusable functions or classes as appropriate.",
  }
}
```
Then, in the chat, enter `@friday /custom /refactor_function` to invoke the custom command.
