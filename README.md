# Obsidian Auto Switch Preview

Auto switch editor's state to preview mode when meeting a specific file. You can define rules to determine which files need to be switched.

## Usage

Add rules on the settings page, or add files or folders directly via menus and commands. When you open the file next time, it will auto switch to the mode. And due to some current limitations, you need to set your default state for editor in plugin setting tab. The default state is 'source'.

When your open a file conformed the rule, plugin will auto switch the editor view to preview mode. And if the file does not conform to the rules, plugin will keep the editor's state as it was before. This plugin only handle two states: 'preview' and 'source'.

Due to the current limitations, when you change rules, it will not be applied to the currently opened file until the next time you open it.

There are three way you can define your rules.

### Black List

You can define the rule which files should not be switched automatically. Every rule in black list should be a regexp. The plugin will match the path through `new RegExp('Your regexp here').test(file.path)`.

> **Note** : The value format of `file.path` is like `diary/today.md`.

You can set it in setting tab.

### White List

You can define the rule which files need to be switched automatically. Every rule in white list should be a regexp.

### File or Folder

You can add paths directly to the list by executing a command to add the currently active open file, or by selecting a file or folder in the sidebar, then right-clicking and selecting the "Auto Switch" item, etc.

In setting tab, you can add it by the dropdown.

### Decision Algorithm

```js
isInBlackList(path) && (isInWhiteList(path) || isInFileOrFolderList(path))
```
