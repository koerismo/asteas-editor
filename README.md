# Asteas Web Editor

[![Deploy to Pages](https://github.com/koerismo/asteas-editor/actions/workflows/pages.yml/badge.svg?branch=public)](https://github.com/koerismo/asteas-editor/actions/workflows/pages.yml)
![enbyware](https://pride-badges.pony.workers.dev/static/v1?label=enbyware&labelColor=%23555&stripeWidth=8&stripeColors=FCF434%2CFFFFFF%2C9C59D1%2C2C2C2C)
![a girl made this!](https://pride-badges.pony.workers.dev/static/v1?label=a+girl+made+this%21&labelColor=%23555&stripeWidth=7&stripeColors=74DEFF%2CFFE1ED%2CFFB5D6%2CFF8CBF%2CFFB5D6%2CFFE1ED%2C74DEFF)

## About

A simple and polished Hotspot texture editor, licensed under GPLv3+

Features:
- Multi-selection and quick editing
- Generates texture maps for material authoring
- Previews texture application on interactive models
- Imports most common image and rect formats, and exports vtfs
- Imports and exports Strata text files
- Embeds and extracts Strata embedded resources

## Formats

| Formats | Imports | Exports | Use |
| -- | -- | -- | -- |
| `rect` | &check; | &check; | Atlas |
| `hot` | &check; | &check; | Atlas |
| `obj` | &check; | &check; | Atlas |
| | | | |
| `vtf` | &check; | &check; | Atlas, Texture |
| | | | |
| `jpeg` | &check; | | Texture |
| `png` | &check; | | Texture |
| `gif` | &check; | | Texture |
| | | | |

## Documentation

This editor is primarily designed for use with Strata Source, however, its formats can be adapted for use with any engine. (Ex. Blender + DreamUV)

### Keybinds

| Key | Action |
| --- | ------ |
| `Ctrl+Z` | Undo |
| `Ctrl+Y`, `Ctrl+Shift+Z`  | Redo |
| `Ctrl+A` | Toggle all selected |
| `Shift` | Edit selection |
| `Shift+Click` | Modify property on all selected |
| `Delete`, `Backspace` | Delete Selected |
| `Escape` | Deselect all |
