# Hazy 

A translucent theme based on <a href="https://github.com/JulienMaille/spicetify-dynamic-theme">DynamicDefault</a> and <a href="https://github.com/nimsandu/spicetify-bloom">Bloom</a>. If you're liking Hazy, please don't forget to ⭐ the project.


## Preview
**Custom Backgrounds**

![demo-base](./hazy_home.png)
![demo-base](./hazy_lyrics.png)
![demo-base](./hazy_play.png)

**Set Background To Album Art**  

![demo-base](./custom_bg.png)
  
### ⏹️ How To Get Sidebar ⏹️
---
1. Click on your Profile > Experimental Features
2. Search"sidebar" 
3. Copy the following settings:
  <div>
    <img width="500px" src="https://github.com/Astromations/Hazy/assets/80211195/72ce19d5-fff5-477b-949e-dcc7c5a6f65c"> <img>
  </div>
  
 <span>**Click the new "Now Playing View" button to activate the sidebar**</span>
  
<span>
  <img src="https://github.com/Astromations/Hazy/assets/80211195/ee64d41c-33f2-41ed-9c70-03a639383570"><img>
 </span>

    
### ⬇️ Automatic Installation ⬇️

---

Windows -> **PowerShell**:

```powershell
iwr -useb https://raw.githubusercontent.com/Astromations/Hazy/main/install.ps1 | iex
```

macOS and Linux -> **Bash**:

```bash
curl -fsSL https://raw.githubusercontent.com/Astromations/Hazy/main/install.sh | sh
```    
    
### 📃 Manual Installation 📃

---

Download the repo and put `user.css`, `theme.js` and `color.ini` into a new folder named `Hazy`, and place this folder into your `Themes` folder in `.spicetify`.
Then run these commands to apply:
    
```powershell
spicetify config current_theme Hazy
spicetify config inject_css 1 replace_colors 1 overwrite_assets 1 inject_theme_js 1
spicetify apply
```


