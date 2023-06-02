# Hazy 

A translucent theme based on <a href="https://github.com/JulienMaille/spicetify-dynamic-theme">DynamicDefault<a/> and <a href="https://github.com/nimsandu/spicetify-bloom">Bloom<a/>

## Preview

![demo-base](./poster.png)
![demo-base](./poster2.png)

### How To Get Sidebar
1. Click on your Profile > Experimental Features
2. Search"sidebar" 
3. Copy the following settings:
  <div>
    <img width="500px" src="https://github.com/Astromations/Hazy/assets/80211195/72ce19d5-fff5-477b-949e-dcc7c5a6f65c"> <img>
  <div/>
    
### Manual Installation

After cloning the repo add the files `user.css` and `color.ini` into a new folder named `Hazy`, and place this folder into your `Themes` folder in `.spicetify`.
Next, add the file `theme.js` into the `Extensions` folder in `.spicetify`
Then run these commands to apply:
    
```powershell
spicetify config current_theme Hazy
spicetify config inject_css 1 replace_colors 1 overwrite_assets 1
spicetify config extensions themes.js
spicetify apply
```


