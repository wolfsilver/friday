export const PROMPTS = {
	refactor_function: `Refactor the following code to eliminate redundancy and improve maintainability by applying the DRY (Don't Repeat Yourself) principle. Identify repeated code patterns and abstract them into reusable functions or classes as appropriate.`,
	refactor_components: `Analyze the following code and split it into smaller, more manageable components. Focus on identifying reusable parts, separating concerns, and improving overall component structure. Provide the refactored code.`,
	refactor_solid: `Please refactor the following code to better adhere to SOLID principles. Focus on Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion where applicable. Explain your changes briefly in comments.`,
	refactor_if_else: `Refactor the following code to completely eliminate nested if-else structures. Use strategies like early returns, guard clauses, and polymorphism to improve clarity and readability. Explore switch statements and design patterns like strategy or state to ensure the code remains maintainable.`,

	// Refactor the following code to improve its performance. Identify bottlenecks, inefficient algorithms, or redundant operations and optimize them. Consider data structures, algorithms, and caching strategies to enhance the code's efficiency.
	refactor_performance: `Review the following code and optimize it for better performance. Focus on algorithmic efficiency, reducing unnecessary computations, and improving data structure usage. If applicable, consider asynchronous operations and memory management.`,

	// Refactor the following code to address security vulnerabilities and prevent common security threats. Focus on input validation, data sanitization, secure communication, and access control. Consider using secure coding practices, encryption, and authentication mechanisms to enhance the code's security.
	refactor_security: `Review the following code and enhance its security measures. Focus on identifying and mitigating common vulnerabilities such as SQL injection, XSS, CSRF, and insecure data handling`,

	refactor_concurrency: `Refactor the following  code to improve its concurrency and multithreading capabilities. Focus on efficient resource sharing, preventing race conditions, and enhancing overall parallel processing performance.`,
};
