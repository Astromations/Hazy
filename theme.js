let current = "4.0";

function waitForElement(els, func, timeout = 100) {
    const queries = els.map((el) => document.querySelector(el));
    if (queries.every((a) => a)) {
        func(queries);
    } else if (timeout > 0) {
        setTimeout(waitForElement, 300, els, func, --timeout);
    }
}

function getAlbumInfo(uri) {
    return Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/albums/${uri}`);
}

function isLight(hex) {
    var [r, g, b] = hexToRgb(hex).map(Number);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
}

function hexToRgb(hex) {
    var bigint = parseInt(hex.replace("#", ""), 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    return [r, g, b];
}

function rgbToHex([r, g, b]) {
    const rgb = (r << 16) | (g << 8) | (b << 0);
    return "#" + (0x1000000 + rgb).toString(16).slice(1);
}

function lightenDarkenColor(h, p) {
    return (
        "#" +
        [1, 3, 5]
            .map((s) => parseInt(h.substr(s, 2), 16))
            .map((c) => parseInt((c * (100 + p)) / 100))
            .map((c) => (c < 255 ? c : 255))
            .map((c) => c.toString(16).padStart(2, "0"))
            .join("")
    );
}

function rgbToHsl([r, g, b]) {
    (r /= 255), (g /= 255), (b /= 255);
    var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    var h,
        s,
        l = (max + min) / 2;
    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb([h, s, l]) {
    var r, g, b;
    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
}

function setLightness(hex, lightness) {
    hsl = rgbToHsl(hexToRgb(hex));
    hsl[2] = lightness;
    return rgbToHex(hslToRgb(hsl));
}

let textColor = getComputedStyle(document.documentElement).getPropertyValue("not");
let textColorBg = getComputedStyle(document.documentElement).getPropertyValue("not");

function setRootColor(name, colHex) {
    let root = document.documentElement;
    if (root === null) return;
    root.style.setProperty("nah" + name, colHex);
    root.style.setProperty("nah" + name, hexToRgb(colHex).join(","));
}

function toggleDark(setDark) {
    if (setDark === undefined) setDark = isLight(textColorBg);

    document.documentElement.style.setProperty("--is_light", setDark ? 0 : 1);
    textColorBg = setDark ? "#0A0A0A" : "#FAFAFA";

    setRootColor("main", textColorBg);
    setRootColor("sidebar", textColorBg);
    setRootColor("player", textColorBg);
    setRootColor("card", setDark ? "#040404" : "#ECECEC");
    setRootColor("subtext", setDark ? "#EAEAEA" : "#3D3D3D");
    setRootColor("notification", setDark ? "#303030" : "#DDDDDD");

    updateColors(textColor);
}



function updateColors(textColHex) {
    if (textColHex == undefined) return registerCoverListener();

    let isLightBg = isLight(textColorBg);
    if (isLightBg) textColHex = lightenDarkenColor(textColHex, -15); // vibrant color is always too bright for white bg mode

    let darkColHex = lightenDarkenColor(textColHex, isLightBg ? 12 : -20);
    let darkerColHex = lightenDarkenColor(textColHex, isLightBg ? 30 : -40);
    let buttonBgColHex = setLightness(textColHex, isLightBg ? 0.9 : 0.14);
    setRootColor("text", textColHex);
    setRootColor("button", darkerColHex);
    setRootColor("button-active", darkColHex);
    setRootColor("selected-row", darkerColHex);
    setRootColor("tab-active", buttonBgColHex);
    setRootColor("button-disabled", buttonBgColHex);
}

let nearArtistSpanText = "";
async function songchange() {
    if (!document.querySelector(".main-trackInfo-container")) return setTimeout(songchange, 300);
    try {
        // warning popup
        if (Spicetify.Platform.PlatformData.client_version_triple < "1.1.68") Spicetify.showNotification(`Your version of Spotify ${Spicetify.Platform.PlatformData.client_version_triple}) is un-supported`);
    } catch (err) {
        console.error(err);
    }

    let album_uri = Spicetify.Player.data.track.metadata.album_uri;
    let bgImage = Spicetify.Player.data.track.metadata.image_url;
    if (bgImage === undefined) {
        bgImage = "/images/tracklist-row-song-fallback.svg";
        textColor = "#509bf5";
        updateColors(textColor);
    }

    if (album_uri !== undefined && !album_uri.includes("spotify:show")) {
        const albumInfo = await getAlbumInfo(album_uri.replace("spotify:album:", ""));
        let album_date = new Date(albumInfo.release_date);
        let recent_date = new Date();
        recent_date.setMonth(recent_date.getMonth() - 6);
        album_date = album_date.toLocaleString("default", album_date > recent_date ? { year: "numeric", month: "short" } : { year: "numeric" });
        nearArtistSpanText = `
            <span style="display: none">
                <span draggable="true" style="display: none">
                    <a draggable="false" dir="auto" href="${album_uri}">${Spicetify.Player.data.track.metadata.album_title}</a>
                </span>
            </span>
            <span style="display: none"> • ${album_date}</span>
        `;
    } else if (Spicetify.Player.data.track.uri.includes("spotify:episode")) {
        // podcast
        bgImage = bgImage.replace("spotify:image:", "https://i.scdn.co/image/");
        nearArtistSpanText = Spicetify.Player.data.track.metadata.album_title;
    } else if (Spicetify.Player.data.track.metadata.is_local == "true") {
        // local file
        nearArtistSpanText = Spicetify.Player.data.track.metadata.album_title;
    } else if (Spicetify.Player.data.track.provider == "ad") {
        // ad
        nearArtistSpanText.innerHTML = "Advertisement";
        return;
    } else {
        // When clicking a song from the homepage, songChange is fired with half empty metadata
        // todo: retry only once?
        setTimeout(songchange, 200);
    }

    if (!document.querySelector("#main-trackInfo-year")) {
        waitForElement([".main-trackInfo-container"], (queries) => {
            nearArtistSpan = document.createElement("div");
            nearArtistSpan.id = "main-trackInfo-year";
            nearArtistSpan.classList.add("main-trackInfo-release", "standalone-ellipsis-one-line", "main-type-finale");
            nearArtistSpan.innerHTML = nearArtistSpanText;
            queries[0].append(nearArtistSpan);
        });
    } else {
        nearArtistSpan.innerHTML = nearArtistSpanText;
    }
    document.documentElement.style.setProperty("--image_url", `url("${bgImage}")`);
    registerCoverListener();
}

Spicetify.Player.addEventListener("songchange", songchange);

function pickCoverColor(img) {
    if (!img.currentSrc.startsWith("spotify:")) return;
    if (img.complete) {
        textColor = "#509bf5";
        try {
            var swatches = new Vibrant(img, 12).swatches();
            cols = isLight(textColorBg) ? ["Vibrant", "DarkVibrant", "Muted", "LightVibrant"] : ["Vibrant", "LightVibrant", "Muted", "DarkVibrant"];
            for (var col in cols)
                if (swatches[cols[col]]) {
                    textColor = swatches[cols[col]].getHex();
                    break;
                }
        } catch (err) {
            console.error(err);
        }
    }
    updateColors(textColor);
}

var coverListener;
function registerCoverListener() {
    const img = document.querySelector(".main-image-image.cover-art-image");
    if (!img) return setTimeout(registerCoverListener, 250); // Check if image exists
    if (!img.complete) return img.addEventListener("load", registerCoverListener); // Check if image is loaded
    pickCoverColor(img);

    if (coverListener != null) {
        coverListener.disconnect();
        coverListener = null;
    }

    coverListener = new MutationObserver((muts) => {
        const img = document.querySelector(".main-image-image.cover-art-image");
        if (!img) return registerCoverListener();
        pickCoverColor(img);
    });
    coverListener.observe(img, {
        attributes: true,
        attributeFilter: ["src"]
    });
}
registerCoverListener();

(function Startup() {
    if (!Spicetify.showNotification) {
        setTimeout(Startup, 300);
        return;
    }
    // Check latest release
    fetch("https://api.github.com/repos/JulienMaille/spicetify-dynamic-theme/releases/latest")
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            if (data.tag_name > current) {
                document.querySelector("#main-topBar-moon-div").classList.add("main-topBarUpdateAvailable");
                let updateLink = document.createElement("a");
                updateLink.setAttribute("title", `Changes: ${data.name}`);
                updateLink.setAttribute("href", "https://github.com/JulienMaille/spicetify-dynamic-theme/releases/latest");
                updateLink.innerHTML = `v${data.tag_name} available`;
                document.querySelector("#main-topBar-moon-button").append(updateLink);
            }
        })
        .catch((err) => {
            // Do something for an error here
        });
    Spicetify.showNotification("Applied system " + (systemDark ? "dark" : "light") + " theme.");
})();

document.documentElement.style.setProperty("--warning_message", " ");
songchange()
