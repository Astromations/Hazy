# Unnamed for [Spicetify](https://github.com/khanhas/spicetify-cli)


A transparent theme for spotify. Based off DynamicDefault and Bloom.

## Preview

![demo-base](./Dark.gif)

### Manual Install

1. Download the latest [Source code (zip)](https://github.com/JulienMaille/spicetify-dynamic-theme/releases/latest)
2. Extract the files to your [Spicetify/Themes folder](https://spicetify.app/docs/development/customization#themes) (rename the zipped folder to `DefaultDynamic`)
3. Copy `default-dynamic.js` to your [Spicetify/Extensions folder](https://spicetify.app/docs/advanced-usage/extensions#installing)
4. Add the 2 lines in `[Patch]` section of the config file (see details below)
5. Run:
    ```
    spicetify config extensions default-dynamic.js extensions Vibrant.min.js
    spicetify config current_theme DefaultDynamic
    spicetify config color_scheme base
    spicetify config inject_css 1 replace_colors 1
    spicetify apply
    ```
