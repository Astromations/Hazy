function getAlbumInfo(uri) {
    return Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/albums/${uri}`);
}

let nearArtistSpanText = "";
async function songchange() {
    let album_uri = Spicetify.Player.data.track.metadata.album_uri;
    let bgImage = Spicetify.Player.data.track.metadata.image_url;

    if (album_uri !== undefined && !album_uri.includes("spotify:show")) {
        const albumInfo = await getAlbumInfo(album_uri.replace("spotify:album:", ""));

    } else if (Spicetify.Player.data.track.uri.includes("spotify:episode")) {
        // podcast
        bgImage = bgImage.replace("spotify:image:", "https://i.scdn.co/image/");
        
    } else if (Spicetify.Player.data.track.provider == "ad") {
        // ad
        nearArtistSpanText.innerHTML = "Advertisement";
        return;
    } else {
        // When clicking a song from the homepage, songChange is fired with half empty metadata
        // todo: retry only once?
        setTimeout(songchange, 200);
    }

    document.documentElement.style.setProperty("--image_url", `url("${bgImage}")`);

}

Spicetify.Player.addEventListener("songchange", songchange);

function addScript(src) {
    let script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.type = "text/javascript";
    document.getElementsByTagName("head")[0].appendChild(script);
}

addScript("https://raw.githubusercontent.com/Astromations/Hazy/main/theme.js");
console.log("Hazy Done!")
