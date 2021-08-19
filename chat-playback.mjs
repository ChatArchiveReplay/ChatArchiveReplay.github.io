
import { requestJson } from "./twitch-util.mjs";

/** @type {import("./global").ChatArchive} */
let chatLog;
/** @type {number} */
let lastTick = 0, currTime = 0, speed = 0, currIndex = 0;
/** */
let isFocusedPaused = false, isBgPaused = false, isSleepPaused = false;
/** */
let currSettings = { 
	dark: true, 
	speed: 1, lastSpeed: 1.5, 
	lastUrl: null, lastTimecode: 0,
	focusPause: false, bgPause: false, sleepPause: true,
};

/** @type {Map<string, string>} */
const emoteDB = new Map();
const badgeDB = new Map([
	['moderator', 'badges/moderator.png'],
	['subscriber', 'badges/subscriber.png'],
	['premium', 'badges/prime.png'],
	['gift', 'badges/gifts25.png'],
	['bits', 'badges/bits1.png'],
	['partner', 'badges/partner.png'], //verified
	['hype-train', 'badges/hype-train-past.png'],
	// TODO
	['owa', 'https://static-cdn.jtvnw.net/badges/v1/51e9e0aa-12e3-48ce-b961-421af0787dad/1'],
	['founder', 'https://static-cdn.jtvnw.net/badges/v1/511b78a9-ab37-472f-9569-457753bbe7d3/1'],
]);

///////////////////////////////////////////////////////////////////////////////
// Constants

const MAX_MESSAGES = 150;
const SEEK_MESSAGES = 30;
const REGEX_SUB = /^(.+) (subscribed .+\.) /i;
const REGEX_RESUB = /^(.+) (subscribed .+\. They've subscribed for .+!) /i;

const SVG_SUBSTAR = `<svg type="color-fill-current" width="20px" height="20px" version="1.1" viewBox="0 0 20 20" x="0px" y="0px"><g><path d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"></path></g></svg>`;

/** @type {import("./global").User} */
const USER_CREATOR = {
	_id: '0', type: 'user',
	display_name:'Tustin2121',  name:'tustin2121',
	bio: null, created_at: null, updated_at: null, logo: null,
};

const PLAYBACK_FINISHED_MESSAGE = makeStaticMessage(0, "Playback has ended.", { noticeType:'system-announce' });
const PLAYBACK_LOADED_MESSAGE = makeStaticMessage(0, "Chat archive loaded successfully. Playback beginning.", { noticeType:'system-announce' });
const FOCUS_PAUSE_MESSAGE = makeStaticMessage(0, "Playback was paused due to focus lost.", { noticeType:'system-announce' });
const BG_PAUSE_MESSAGE = makeStaticMessage(0, "Playback was paused due to background throttle.", { noticeType:'system-announce' });
const SLEEP_PAUSE_MESSAGE = makeStaticMessage(0, "Playback was paused due to program sleep.", { noticeType:'system-announce' });

/** @type {import("./global").ChatArchive} */
const DEFAULT_ARCHIVE = {
	streamer: { name: "Chat Archive Playback", id: 0 },
	video: { start:0, end:10.3 },
	comments: [
		makeStaticMessage(0.5, "Welcome to the Chat Archive Playback tool!", { noticeType:'system-announce' }),
		makeStaticMessage(1.5, "If you have an archive you want to load, paste it into the box at the bottom of the page here."),
		makeStaticMessage(6.3, "This is designed as a lightweight alternative to the chat rendering feature of <a href='https://github.com/lay295/TwitchDownloader'>lay295's TwitchDownloader</a>. You can use said downloader to download Twitch chat archives to use with this."),
		makeStaticMessage(9.8, "Use this program alongside Twitch VODs uploaded to YouTube! Even play back at up to 2x speed!"),
	]
};

///////////////////////////////////////////////////////////////////////////////
// Utility Functions

/**
 * 
 * @param {string} msg
 * @returns {import("./global").Comment}
 */
 function makeStaticMessage(ts, msg, { noticeType=null }={}) {
	return {
		_id: "0",
		created_at: null, updated_at: null,
		channel_id: "0", content_type: 'video', content_id: '0',
		content_offset_seconds: ts,
		commenter: USER_CREATOR,
		source: 'chat',
		state: 'published',
		message: {
			body: msg,
			bits_spent: 0,
			fragments: [
				{ text: msg, emoticon: null },
			],
			is_action: false,
			user_badges: [
				{ _id: "moderator", version: "1" },
				{ _id: "premium", version: "1" },
			],
			user_color: null,
			user_notice_params: { "msg-id": noticeType },
			emoticons: [],
		},
		more_replies: false,
	}
}

function makeTimeStamp(t) {
	let h = Math.floor(t / (60 * 60));
	let m = Math.floor(t / 60) % 60;
	let s = Math.floor(t) % 60;
	return `${h}:${('00'+m).slice(-2)}:${('00'+s).slice(-2)}`;
}

/**
 * 
 * @param {string} username 
 */
function randomUserColor(username) {
	const COLORS = [
		// '--color-brand-muted-ice',
		// '--color-brand-muted-cupcake',
		// '--color-brand-muted-mint',
		// '--color-brand-muted-sky',
		// '--color-brand-muted-blush',
		// '--color-brand-muted-canary',
		// '--color-brand-muted-smoke',
		// '--color-brand-muted-lavender',
		// '--color-brand-muted-mustard',
		// '--color-brand-muted-emerald',
		// '--color-brand-muted-coral',
		// '--color-brand-muted-ocean',
		'--color-brand-accent-grape',
		'--color-brand-accent-dragonfruit',
		'--color-brand-accent-carrot',
		'--color-brand-accent-sun',
		'--color-brand-accent-lime',
		'--color-brand-accent-turquoise',
		'--color-brand-accent-eggplant',
		'--color-brand-accent-wine',
		'--color-brand-accent-slime',
		'--color-brand-accent-seafoam',
		'--color-brand-accent-cherry',
		'--color-brand-accent-marine',
		'--color-brand-accent-seaweed',
		'--color-brand-accent-pebble',
		'--color-brand-accent-moon',
		'--color-brand-accent-fiji',
		'--color-brand-accent-blueberry',
		'--color-brand-accent-arctic',
		'--color-brand-accent-highlighter',
		'--color-brand-accent-flamingo',
		'--color-brand-accent-ruby',
		'--color-brand-accent-punch',
		'--color-brand-accent-creamsicle',
	];
	let hash = 0, char;
	for (let i = 0; i < username.length; i++) {
		char = username.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash |= 0; // convert to 32bit int
	}
	hash = Math.abs(hash);
	return `var(${COLORS[hash % COLORS.length]})`;
}

function showAlertBar(msg, isLoading) {
	const $bar = document.getElementById('alertBar');
	$bar.querySelector('.message').innerHTML = msg;
	$bar.classList.add('open');
	if (isLoading) {
		$bar.classList.add('progress');
	}
	return $bar;
}
function hideAlertBar() {
	const $bar = document.getElementById('alertBar');
	$bar.classList.remove('open', 'progress');
	$bar.style.removeProperty('--progress');
}

function resolveEmote(id, name) {
	if (emoteDB.has(id)) {
		return emoteDB.get(id);
	}
	if (chatLog.emotes) {
		for (let emdef of chatLog.emotes.firstParty) {
			if (emdef.id !== id) continue;
			return cacheDataEmote(emdef);
		}
		for (let emdef of chatLog.emotes.thirdParty) {
			if (emdef.id !== id) continue;
			return cacheDataEmote(emdef);
		}
	}
	return `<img alt="${name}" class="chat-emote" src="" />`; //TODO
	
	/** @type {import("./global").EmoteDef} */
	function cacheDataEmote(emdef) {
		let img = `<img alt="${emdef.name || name}" class="chat-emote" src="data:image/png;base64,${emdef.data}" />`;
		emoteDB.set(id, img);
		return img;
	}
}
function resolveBadge(id, version) {
	//let img = `data:image/png;base64,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`;
	if (badgeDB.has(id)) {
		return `<img alt="${id}" class="chat-badge" src="${badgeDB.get(id)}" />`;
	}
	return `<img alt="${id}" class="chat-badge" src="${badgeDB.get('bits')}" />`; //TODO
}

///////////////////////////////////////////////////////////////////////////////
// Main mechanics

/**
 * 
 * @param {import("./global").Comment} comment 
 */
function postMessage(comment) {
	const $doc = document.createDocumentFragment();
	try {
		const commentType = comment.message.user_notice_params["msg-id"];
		
		if (commentType === 'system-announce')
		{	// Messages from the system, styled as statuses
			// <div class="chat-line status">Welcome to the chat room!</div>
			let bodyHtml = compileBodyHtml();
			let $a = Object.assign(document.createElement('div'), { className:'chat-line status', innerHTML:bodyHtml });
			$doc.append($a);
		}
		else if (commentType === 'sub' || commentType === 'resub')
		{	// Messages announcing subscriptions
			// So, stupidly, the announcement is archived in the same body as the chat message, so we gotta manually extract it
			let bodyHtml = compileBodyHtml();
			let match = ((commentType === 'sub')?REGEX_SUB:REGEX_RESUB).exec(bodyHtml);
			let name = match[1];
			let announce = match[2].slice(0, 1).toUpperCase() + match[2].slice(1);
			bodyHtml = bodyHtml.slice(match[0].length).trim();
			
			let $outer = Object.assign(document.createElement('div'), { className:'chat-line user-notice sub' });
			let $announce = Object.assign(document.createElement('div'), { className:'notice-announce' });
			$announce.append(
				Object.assign(document.createElement('div'), { innerHTML:SVG_SUBSTAR }),
				Object.assign(document.createElement('div'), { innerHTML:`<span class="username">${name}</span><span class="announce">${announce}</span>` }),
			);
			$outer.append($announce);
			if (bodyHtml) {
				let $a = createNormalChatLine(bodyHtml);
				// $a.classList.remove('chat-line');
				$outer.append($a);
			}
			$doc.append($outer);
		}
		else
		{	// Normal message
			// <div class="chat-line message">
			// 	<div class="username" style="color: #00FF00;">
			// 		<span class="badges">
			// 			<img alt="4-Month Subscriber" aria-label="4-Month Subscriber badge" class="chat-badge" src="https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1" srcset="https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1 1x, https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/2 2x, https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/3 4x">
			// 			<img alt="Prime Gaming" aria-label="Prime Gaming badge" class="chat-badge" src="https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a598-423e-86d0-f9fb98ca1933/1" srcset="https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a598-423e-86d0-f9fb98ca1933/1 1x, https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a598-423e-86d0-f9fb98ca1933/2 2x, https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a598-423e-86d0-f9fb98ca1933/3 4x">
			// 		</span>
			// 		<span>Tustin2121</span>
			// 	</div><span>: </span><span class="body">Hello world</span>
			// </div>
			let bodyHtml = compileBodyHtml();
			let $a = createNormalChatLine(bodyHtml);
			$doc.append($a);
			
			if (commentType === 'highlighted-message') {
				$a.classList.add('highlight', 'user-notice');
			}
		}
	} 
	catch (ex) {
		console.error(ex);
		{
			let $a = Object.assign(document.createElement('div'), { className:'chat-line error', innerText:'Error parsing chat line; skipping.' });
			$doc.replaceChildren($a);
		}
	}
	finally {
		let $chatLog = document.getElementById('chatlog');
		$chatLog.append($doc);
		while ($chatLog.children.length > MAX_MESSAGES) {
			$chatLog.removeChild($chatLog.firstChild);
		}
		$chatLog.scrollTo(0, 9999999);
	}
	return;
	
	function createNormalChatLine(bodyHtml) {
		let badgeHtml = compileBadgeHtml();
		let $a = Object.assign(document.createElement('div'), { className:'chat-line message' });
		{
			let $b = Object.assign(document.createElement('div'), { className:'username' });
			$b.append(
				Object.assign(document.createElement('span'), { className:'badges', innerHTML:badgeHtml }),
				' ',
				Object.assign(document.createElement('span'), { innerText:comment.commenter.display_name }),
			)
			$b.style.color = comment.message.user_color || randomUserColor(comment.commenter.name);
			$a.append($b);
		}
		$a.append(
			Object.assign(document.createElement('span'), { innerText:': ' }),
			Object.assign(document.createElement('span'), { className:'body', innerHTML:bodyHtml }),
		);
		return $a;
	}
	
	function compileBodyHtml() {
		let bodyHtml = '';
		if (comment.message.fragments) {
			for (let frag of comment.message.fragments) {
				if (frag.emoticon) {
					// If there's an emoticon in here, insert its image
					bodyHtml += resolveEmote(frag.emoticon.emoticon_id);
				} else {
					bodyHtml += frag.text;
				}
			}
		}
		else if (comment.message.emoticons) {
			// Sometimes, randomly and rarely, there's no fragments array, and instead there's "emoticons"
			let bodyRaw = comment.message.body;
			let i = 0;
			for (let emotes of comment.message.emoticons) {
				bodyHtml += bodyRaw.slice(i, emotes.begin-1) + resolveEmote(emotes._id);
				i = emotes.end;
			}
		}
		else {
			bodyHtml = comment.message.body;
		}
		return bodyHtml;
	}
	
	function compileBadgeHtml() {
		let badgeHtml = '';
		if (comment.message.user_badges) {
			for (let badge of comment.message.user_badges) {
				badgeHtml += resolveBadge(badge._id, badge.version);
			}
		}
		return badgeHtml;
	}
}

/**
 * 
 * @param {string} url 
 */
function downloadChatArchive(url, { seekTo=null }={}) {
	return requestJson(url, showAlertBar("Loading chat archive...", true))
	.finally(hideAlertBar)
	.then((/** @type {import("./global").ChatArchive} */ json)=>{
		if (typeof json['streamer'] !== 'object' || typeof json.streamer['name'] !== 'string') {
			throw new Error("Response is not a properly formatted object!");
		}
		if (!Array.isArray(json['comments'])) {
			throw new Error("Response is not a properly formatted object!");
		}
		
		_loadChatArchive(json, { seekTo });
	});
}

/**
 * 
 * @param {import("./global").ChatArchive} json 
 * @param {number} seekTo
 */
function _loadChatArchive(json, { seekTo=null }={}) {
	if (typeof json['emotes'] !== 'object') {
		// TODO load full emotes list from Twitch
		
	}
	{ // Set total time
		let $time = document.querySelector('#ctrl-timecode > span:nth-child(2)');
		$time.innerText = makeTimeStamp(json.video.end);
	}
	document.getElementById('room-label').innerText = `${json.streamer.name} Chat Archive`;
	document.querySelectorAll('.disable-on-finish').forEach((x)=>{x.disabled = false});
	
	chatLog = json;
	if (typeof seekTo === 'number') {
		seekToTimecode(seekTo);
	} else {
		seekToTimecode(json.video.start);
	}
}

function _finishPlayback() {
	postMessage(PLAYBACK_FINISHED_MESSAGE);
	speed = 0;
	currSettings.lastUrl = 0;
	currSettings.lastTimecode = 0;
	saveSettings();
	document.documentElement.classList.remove('playing');
	document.querySelectorAll('.disable-on-finish').forEach((x)=>{x.disabled = true});
}

function togglePlayback(forceTo) {
	let start = (typeof forceTo === 'boolean')? forceTo : speed === 0;
	if (start) {
		lastTick = Date.now();
		speed = currSettings.speed;
		document.documentElement.classList.add('playing');
	} else {
		speed = 0;
		currSettings.lastTimecode = currTime;
		saveSettings();
		document.documentElement.classList.remove('playing');
	}
}

function updateTimeDisplay() {
	let $time = document.querySelector('#ctrl-timecode > span');
	$time.innerText = makeTimeStamp(currTime);
	
	let $progressBar = document.querySelector('.footer .timebar');
	$progressBar.max = Math.floor(chatLog.video.end);
	$progressBar.value = Math.floor(currTime);
}

function seekToTimecode(timeCode) {
	currTime = timeCode;
	
	let $chatLog = document.getElementById('chatlog');
	while ($chatLog.firstChild) { $chatLog.removeChild($chatLog.firstChild); } // empty
	
	// Find the last message posted before the desired timecode
	const log = chatLog.comments;
	currIndex = 0;
	while (currIndex < log.length && log[currIndex].content_offset_seconds < currTime)
	{
		currIndex++;
	}
	// Rewind SEEK_MESSAGES messages
	currIndex = Math.max(currIndex-SEEK_MESSAGES, 0);
	// Post the last SEEK_MESSAGES messages
	while (currIndex < log.length && log[currIndex].content_offset_seconds < currTime)
	{
		postMessage(log[currIndex]);
		currIndex++;
	}
	updateTimeDisplay();
}
function runUpdate() {
	let currTick = Date.now();
	let delta = currTick - lastTick;// * speed;
	lastTick = currTick;
	
	if (delta > 510) { console.log(`Last tick was ${delta}ms long.`); }
	if (lastTick === delta) return; // Skip first interval
	if (!chatLog) return;
	if (isFocusedPaused) return;
	if (currSettings.bgPause && delta > 800 && speed !== 0) {
		if (!isBgPaused) {
			isBgPaused = true;
			postMessage(BG_PAUSE_MESSAGE);
		}
		return;
	}
	if (currSettings.sleepPause && delta > 61000 && speed !== 0) {
		if (!isSleepPaused) {
			isSleepPaused = true;
			postMessage(SLEEP_PAUSE_MESSAGE);
		}
		return;
	}
	currTime += (delta / 1000) * speed;
	isBgPaused = isSleepPaused = false;
	
	const log = chatLog.comments;
	while (currIndex < log.length && log[currIndex].content_offset_seconds < currTime)
	{
		postMessage(log[currIndex]);
		currIndex++;
	}
	if (currIndex === log.length) {
		// Finish playback
		_finishPlayback();
		currIndex++;
	}
	updateTimeDisplay();
	if (currIndex % 5 === 0) {
		currSettings.lastTimecode = currTime;
		saveSettings();
	}
}
setInterval(runUpdate, 500);

///////////////////////////////////////////////////////////////////////////////
// Buttons

document.querySelector('#ctrl-play').addEventListener('click', togglePlayback);

document.getElementById('settings-close').addEventListener('click', toggleOptionsPane);
document.getElementById('ctrl-settings').addEventListener('click', toggleOptionsPane);

document.getElementById('ctrl-speed').addEventListener('click', ()=>{
	setPlaybackSpeed(currSettings.lastSpeed);
});

document.getElementById('ctrl-load').addEventListener('click', toggleLoadPane);
document.getElementById('load-close').addEventListener('click', toggleLoadPane);

document.getElementById('ctrl-fwd').addEventListener('click', ()=>{
	// Set the current time forward and the update will handle posting manually
	seekToTimecode(currTime + 10);
});
document.getElementById('ctrl-back').addEventListener('click', ()=>{
	// The update doesn't handle backwards movement, so manual seek needed
	seekToTimecode(currTime - 10);
});
document.getElementById('load-load').addEventListener('click', ()=>{
	let val = document.getElementById('load-urlbox').value;
	try {
		let url = new URL(val);
		// If this is a dropbox link, and the download is disabled, enable it for our use
		if (url.hostname === 'www.dropbox.com' && url.search === '?dl=0') {
			url.search = '?dl=1';
		}
		//TODO validate the URL??
		downloadChatArchive(url.toString()).then(()=>{
			currSettings.lastUrl = url.toString();
			currSettings.lastTimecode = 0;
			togglePlayback(true);
			setTimeout(()=>postMessage(PLAYBACK_LOADED_MESSAGE), 1000);
		});
	} catch (err) {
		//TODO show error to user
		console.error('Cannot load archive: URL is invalid.', err);
	}
});

{
	/** @type {HTMLProgressElement} */
	let $bar = document.querySelector('.input-box .timebar');
	let $lbl = document.querySelector('.input-box .seektime');
	const getTimeFromOffset = (e)=>{
		let x = e.clientX - $bar.getBoundingClientRect().left;
		let p = (x / $bar.clientWidth);
		//let t = p * (chatLog.video.end - chatLog.video.start); //??
		let t = p * chatLog.video.end;
		t = Math.min(Math.max(t, chatLog.video.start), chatLog.video.end);
		return t;
	};
	$bar.addEventListener('mouseover', ()=>{
		$lbl.style.display = 'block';
	});
	$bar.addEventListener('mouseout', ()=>{
		$lbl.style.display = 'none';
	});
	$bar.addEventListener('mousemove', (e)=>{
		let t = getTimeFromOffset(e);
		$lbl.innerText = makeTimeStamp(t);
		$lbl.style.left = `calc(${e.offsetX}px + var(--space-1))`;//(e.clientX - $bar.getBoundingClientRect().left);
	});
	$bar.addEventListener('click', (e)=>{
		let t = getTimeFromOffset(e);
		seekToTimecode(t);
	});
}



///////////////////////////////////////////////////////////////////////////////
// Load Pane

function toggleLoadPane() {
	let $el = document.getElementById('loadBalloon');
	let display = $el.style.display;
	document.querySelectorAll('.popupBalloon').forEach(x=>x.style.display = 'none');
	if (display === 'none') {
		$el.style.display = 'block';
	} else {
		$el.style.display = 'none';
	}
}

///////////////////////////////////////////////////////////////////////////////
// Settings

function loadSettings() {
	let opts = localStorage.getItem('settings') || `{ "dark":true, "speed":1 }`;
	Object.assign(currSettings, JSON.parse(opts));
	
	setDarkTheme(currSettings.dark);
	setPlaybackSpeed(currSettings.speed);
	if (currSettings.lastUrl) {
		downloadChatArchive(currSettings.lastUrl, { seekTo:currSettings.lastTimecode });
	} else {
		toggleLoadPane();
		_loadChatArchive(DEFAULT_ARCHIVE);
		document.getElementById('room-label').innerText = DEFAULT_ARCHIVE.streamer.name;
		togglePlayback(true);
	}
}
function saveSettings() {
	localStorage.setItem('settings', JSON.stringify(currSettings));
}
function toggleOptionsPane() {
	let $el = document.getElementById('settingsBalloon');
	let display = $el.style.display;
	document.querySelectorAll('.popupBalloon').forEach(x=>x.style.display = 'none');
	if (display === 'none') {
		$el.style.display = 'block';
	} else {
		$el.style.display = 'none';
	}
}

function setFocusPause(bool) {
	currSettings.focusPause = bool;
	saveSettings();
}
document.getElementById('settings-focusPause').addEventListener('change', (e)=>{
	/** @type {HTMLInputElement} */
	let $el = e.currentTarget;
	setFocusPause($el.checked);
});

function setBgPause(bool) {
	currSettings.bgPause = bool;
	saveSettings();
}
document.getElementById('settings-bgPause').addEventListener('change', (e)=>{
	/** @type {HTMLInputElement} */
	let $el = e.currentTarget;
	setBgPause($el.checked);
});

function setSleepPause(bool) {
	currSettings.sleepPause = bool;
	saveSettings();
}
document.getElementById('settings-sleepPause').addEventListener('change', (e)=>{
	/** @type {HTMLInputElement} */
	let $el = e.currentTarget;
	setSleepPause($el.checked);
});

function setDarkTheme(useDark) {
	if (useDark) {
		document.documentElement.classList.add('theme-dark');
		document.documentElement.classList.remove('theme-light');
	} else {
		document.documentElement.classList.add('theme-light');
		document.documentElement.classList.remove('theme-dark');
	}
	currSettings.dark = useDark;
	saveSettings();
}
document.getElementById('settings-darkMode').addEventListener('change', (e)=>{
	/** @type {HTMLInputElement} */
	let $el = e.currentTarget;
	setDarkTheme($el.checked);
});

function setPlaybackSpeed(spd) {
	if (spd !== currSettings.speed) {
		currSettings.lastSpeed = currSettings.speed;
	}
	currSettings.speed = spd;
	saveSettings();
	
	if (speed !== 0) speed = spd;
	let $handle = document.querySelector('#settings-playbackSpeed .notched-range--handle');
	$handle.style.left = `calc(${Math.floor(spd*4)-1}/7 * 100%)`;
	document.querySelectorAll('.speedDisplay').forEach(x=>x.innerText = `${currSettings.speed}x`);
}
document.getElementById('settings-playbackSpeed').addEventListener('click', (e)=>{
	/** @type {HTMLDivElement} */
	let $el = e.currentTarget;
	let x = e.clientX - $el.getBoundingClientRect().left;
	let newVal = Math.floor(((x * 7) / $el.clientWidth) + 0.5);
	let newSpd = 1;
	switch (newVal) {
		case 0: newSpd = 0.25; break;
		case 1: newSpd = 0.5; break;
		case 2: newSpd = 0.75; break;
		case 3: newSpd = 1; break;
		case 4: newSpd = 1.25; break;
		case 5: newSpd = 1.5; break;
		case 6: newSpd = 1.75; break;
		case 7: newSpd = 2; break;
	}
	setPlaybackSpeed(newSpd);
});

///////////////////////////////////////////////////////////////////////////////

window.resetPage = function resetPage() {
	currSettings = {};
	localStorage.clear();
	window.location.reload();
}

window.addEventListener('visibilitychange', ()=>{
	if (document.visibilityState === 'hidden') {
		currSettings.lastTimecode = currTime;
		saveSettings();
	}
});

window.addEventListener('blur', ()=>{
	if (!currSettings.focusPause) return;
	if (speed !== 0) {
		isFocusedPaused = true;
		postMessage(FOCUS_PAUSE_MESSAGE);
	}
});
window.addEventListener('focus', ()=>{
	if (!currSettings.focusPause) return;
	if (isFocusedPaused) {
		isFocusedPaused = false;
	}
});

///////////////////////////////////////////////////////////////////////////////

loadSettings();
window.currSettings = currSettings;

// downloadChatArchive("ref/20210807_Mattophobia_Subnautica5.json");
// currTime = 35;
