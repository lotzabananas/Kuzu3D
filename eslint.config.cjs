module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: ['eslint:recommended'],
	parserOptions: {
		ecmaVersion: 12,
		sourceType: 'module',
	},
	globals: {
		window: "readonly",
		document: "readonly",
		console: "readonly",
		fetch: "readonly",
		navigator: "readonly",
		setTimeout: "readonly",
		clearTimeout: "readonly",
		setInterval: "readonly",
		clearInterval: "readonly",
		requestAnimationFrame: "readonly",
		URL: "readonly",
		URLSearchParams: "readonly",
		FormData: "readonly",
		localStorage: "readonly",
		confirm: "readonly"
	},
	rules: {
		'sort-imports': [
			'error',
			{
				ignoreCase: false,
				ignoreDeclarationSort: false,
				ignoreMemberSort: false,
				memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
				allowSeparatedGroups: false,
			},
		],
		'no-unused-vars': [
			'warn',
			{ vars: 'all', args: 'all', argsIgnorePattern: '^_' },
		],
		'lines-between-class-members': ['warn', 'always'],
	},
};