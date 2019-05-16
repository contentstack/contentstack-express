[![Contentstack](https://www.contentstack.com/docs/static/images/contentstack.png)](https://www.contentstack.com/)

# Contentstack web application framework based on Express

## Install CLI

**Note**
- **This library has been deprecated.** Contentstack will soon stop supporting this framework. Instead, we recommend using [DataSync](https://www.contentstack.com/docs/guide/synchronization/contentstack-datasync), which is faster and more flexible than the web framework.
- This version of Contentstack CLI & Contentstack Express can be used only for V3 stacks. Use CLI version 1.x, for V2 stacks.

Run the following command in a Terminal or Command Prompt to globally install the latest version of Contentstack CLI on your system:

```bash
npm install -g contentstack-cli
```

<em>You may need administrator privileges to perform this installation.</em>

## Connect to a Stack
Start building your web application by connecting it to your existing stack.

Navigate to your workspace in the terminal, and run the 'connect' command.

```bash
contentstack connect
```

This will prompt you to enter the stack's api key and access token. You can find these details in the Settings > Stack page.

```bash
Enter your stack api key: {API_KEY}
Enter your stack access token: {ACCESS_TOKEN}
```

This will validate the stack. Once validated, you will be prompted to enter the project root directory and select one of the publishing environments of your stack.

```bash
Enter the name of the directory to contain the project: (my-site)
Select the publishing environment:
1. development
2. staging
...
```
This will automatically configure your project for the selected publishing environment along with basic theme for the website.

### Run the Site

Navigate to this folder and start the site.

```bash
cd my-site
npm start
```

## Links
- [Website](https://www.contentstack.com/)
- [Official Documentation](http://contentstack.com/docs)

### License
Copyright © 2019 [Contentstack](https://www.contentstack.com/). All Rights Reserved.
