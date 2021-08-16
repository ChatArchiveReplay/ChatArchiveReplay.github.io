
type uuid = string; // "8db1678d-e3e1-4c19-8c48-9d9a94a35c53"
type timestamp = string; // "2021-06-22T18:03:08.939Z"
type url = string;
type color = string; // "#008000"

interface CommentFragment {
	text: string;
	emoticon: null | {
		emoticon_id: string,
		emoticon_set_id: string,
	};
}

interface CommentMessage {
	body: string;
	bits_spent: number;
	fragments: CommentFragment[] | null,
	is_action: boolean,
	user_badges: Array<{ _id:string, version:string }> | null;
	user_color: color | null;
	user_notice_params: {
		"msg-id": null | 'resub' | 'sub' | 'highlighted-message' | 'system-announce',
	};
	emoticons: Array<{ _id:string, begin:number, end:number }>;
}

export interface User {
	display_name: string;
	_id: string;
	name: string;
	type: 'user';
	bio: string | null;
	created_at: timestamp;
	updated_at: timestamp;
	logo: url;
}

export interface Comment {
	_id: uuid;
	created_at: timestamp;
	updated_at: timestamp;
	channel_id: string;
	content_type: 'video';
	content_id: string;
	content_offset_seconds: number;
	commenter: User;
	source: 'chat';
	state: 'published';
	message: CommentMessage;
	more_replies: boolean;
}

export interface EmoteDef {
	id : string;
	imageScale : number;
	data : string;
	name? : string;
}

export interface VersionedObject<T> {
	versions: Record<string, T>;
}

export interface BadgeDef {
	image_url_1x: string;
	image_url_2x: string;
	image_url_4x: string;
	description: string;
	title: string;
	click_action?: string;
	click_url?: string;
	last_updated?: string | null;
}

export interface ChatArchive {
	streamer : { name:string, id:number };
	comments: Comment[];
	video : { start:number, end:number };
	emotes? : { thirdParty:EmoteDef[], firstParty:EmoteDef[] },
	badges? : { global:VersionedObject<BadgeDef>, subscriber:VersionedObject<BadgeDef> },
}

export interface BadgeArchive {
	badge_sets: Record<String, VersionedObject<BadgeDef>>;
}