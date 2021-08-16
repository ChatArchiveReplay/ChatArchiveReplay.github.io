
/**
 * 
 * @param {string} url 
 * @param {HTMLElement} $progressBar 
 * @returns 
 */
export function requestJson(url, $progressBar) {
	if (typeof url !== 'string') return Promise.reject("Url is not valid.");
	return new Promise((resolve, reject)=>{
		let req = new XMLHttpRequest();
		req.addEventListener('load', (ev)=>{
			if (req.response === null) return reject(new Error("Response not JSON"));
			return resolve(req.response);
		});
		req.addEventListener('error', (ev)=>{
			reject(new Error("Request returned "+req.status));
		});
		req.addEventListener('abort', (ev)=>{
			reject(new Error('Request aborted'));
		});
		if ($progressBar && $progressBar.style) {
			req.addEventListener('progress', (ev)=>{
				$progressBar.style.setProperty('--progress', `${(ev.loaded/ev.total)*100}%`);
			});
		}
		req.open('GET', url, true);
		req.responseType = 'json';
		req.send();
	});
}

// Ported utilities from https://github.com/lay295/TwitchDownloader/blob/master/TwitchDownloaderCore/TwitchHelper.cs#L404
export async function getChatBadges(streamerId) {
	/** @type {import("./global").BadgeArchive} */
	let json;
	if (streamerId) {
		json = await requestJson(`https://badges.twitch.tv/v1/badges/channels/${streamerId}/display`)
	} else {
		json = await requestJson(`https://badges.twitch.tv/v1/badges/global/display`);
	}
	if (typeof json['badge_sets'] !== 'object') throw new TypeError('Returned badge json is invalid!');
	return json;
}