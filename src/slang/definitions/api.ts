import {Observable, Subject} from "rxjs";
import {delay, filter, map} from "rxjs/operators";

import {BlueprintMeta} from "../core/models/blueprint";

export interface XY {
	x: number;
	y: number;
}

export interface TypeDefApiResponse {
	type: "string" | "number" | "boolean" | "binary" | "trigger" | "primitive" | "map" | "stream" | "generic";
	map?: {
		[portName: string]: TypeDefApiResponse,
	};
	stream?: TypeDefApiResponse;
	generic?: string;
}

export interface PortGroupsApiResponse {
	[portGroupName: string]: PortGroupApiResponse;
}

export interface PortGroupApiResponse {
	in: TypeDefApiResponse;
	out: TypeDefApiResponse;
	geometry?: {
		in: {
			position: number,
		}
		out: {
			position: number,
		},
	};
}

export interface PropertyApiResponse {
	[propertyName: string]: TypeDefApiResponse;
}

export interface PropertyAssignmentsApiResponse {
	[propertyName: string]: any;
}

export interface GenericSpecificationsApiResponse {
	[genericIdentifier: string]: TypeDefApiResponse;
}

export interface RunningOperatorJson {
	operator: string;
	url: string;
	handle: string;
}

export interface PortMessageJson {
	handle: string;
	port: string;
	data: SlangTypeValue;
	isBOS: boolean;
	isEOS: boolean;
}

export interface OperatorGeometry {
	position: XY;
}

export interface OperatorJson {
	operator: string;
	geometry?: OperatorGeometry;
	properties: PropertyAssignmentsApiResponse;
	generics: GenericSpecificationsApiResponse;
}

export interface BlueprintJson {
	id: string;
	meta: BlueprintMeta;
	operators?: {
		[operatorName: string]: OperatorJson,
	};
	properties?: PropertyApiResponse;
	services?: PortGroupsApiResponse;
	delegates?: PortGroupsApiResponse;
	connections?: ConnectionsApiResponse;
	geometry?: {
		size: {
			width: number
			height: number,
		},
	};
	tests?: any;
	complete?: boolean;
}

export interface ConnectionsApiResponse {
	[sourcePortReference: string]: string[];
}

export interface Message {
	topic: MessageTopic;
	payload: MessagePayload;
}

export enum MessageTopic {
	Port = "Port",
}

export type MessagePayload = any;

const enum WSEvent {
	CLOSE = "close",
	ERROR = "error",
	MESSAGE = "message",
	OPEN = "open",
}

class SocketService {
	private socket: WebSocket;

	constructor(url: string) {
		this.socket = new WebSocket(url);
	}

	// `WSEvent.CLOSE` happens when the client or the server
	// disconnects in a clean fashion and also when the there is an
	// `WSEvent.ERROR`
	public onDisconnect(): Observable<WSEvent> {
		return new Observable<WSEvent>((observer) => {
			this.onEvent(WSEvent.CLOSE).subscribe(() => {
				observer.next();
			});
		});
	}

	public onConnect(): Observable<any> {
		return this.onEvent(WSEvent.OPEN);
	}

	public onMessage(): Observable<Message> {
		return new Observable<Message>((observer) => {
			this.socket.addEventListener(WSEvent.MESSAGE, (ev: MessageEvent) => {
				try {
					const msg = JSON.parse(ev.data) as Message[];
					msg.forEach((v: Message) => {
						if (typeof v.topic === "undefined") {
							return;
						}
						observer.next(v);
					});
				} catch (err) {
					return;
				}
			});
		});
	}

	private onEvent(event: WSEvent): Observable<any> {
		return new Observable<WSEvent>((observer) => {
			this.socket.addEventListener(event, () => {
				observer.next();
			});
		});
	}
}

export class ApiService {

	private readonly url: string;
	private ws: SocketService;
	private disconncected = new Subject<any>();
	private conncected = new Subject<any>();
	private reconnect = new Subject<any>();
	private reconnected = new Subject<any>();
	private reconnecting = new Subject<any>();
	private message = new Subject<Message>();

	constructor(host: string) {
		this.url = host;
		this.ws = this.createSocketService();

		// tslint:disable:no-magic-numbers
		this.reconnect.pipe(delay(1000)).subscribe(() => {
			this.reconnecting.next();
			this.ws = this.createSocketService();
		});
	}

	public subscribeDisconnected(cb: () => void) {
		this.disconncected.subscribe(cb);
	}

	public subscribeReconnected(cb: () => void) {
		this.reconnected.subscribe(cb);
	}

	public subscribeReconnecting(cb: () => void) {
		this.reconnecting.subscribe(cb);
	}

	public subscribeConnected(cb: () => void) {
		this.conncected.subscribe(cb);
	}

	public subscribeMessage(cb: (m: Message) => void) {
		this.message.subscribe(cb);
	}

	public getTopicObserver(topic: MessageTopic): Observable<MessagePayload> {
		return this.message.pipe(
			filter((obj) => obj.topic === topic),
			map((obj) => obj.payload),
		);
	}

	public subscribePortMessage(ro: RunningOperatorJson, cb: (m: PortMessageJson) => void) {
		this.getTopicObserver(MessageTopic.Port).pipe(
			filter((pmsg: PortMessageJson) => pmsg.handle === ro.handle),
		).subscribe(cb);
	}

	public async getBlueprints(): Promise<BlueprintsJson> {
		return this.httpGet<{}, BlueprintsJson>(
			"/operator/",
			{},
			(data: any) => {
				const bpdef: BlueprintApiResponse[] = (data as { objects: any }).objects;
				return {
					elementary: bpdef.filter((bp) => bp.type === "elementary").map((bp) => bp.def),
					library: bpdef.filter((bp) => bp.type === "library").map((bp) => bp.def),
					local: bpdef.filter((bp) => bp.type === "local").map((bp) => bp.def),
				};
			},
			(err: any) => {
				console.error(err);
			},
		);
	}

	public async storeBlueprint(blueprintDefJSON: BlueprintJson): Promise<any> {
		const process = (data: any) => {
			if (data) {
				console.error(data);
				return false;
			}
			return true;
		};
		const error = (err: any) => {
			console.error(err);
		};

		return new Promise<boolean>((resolve) => {
			const reqInit = {method: "post", body: JSON.stringify(blueprintDefJSON)};
			fetch(`${this.url}/operator/def/`, reqInit)
				.then((response: Response) => response.json())
				.then((data: any) => {
					resolve(process(data));
				})
				.catch(error);
		});
	}

	public async deployBlueprint(blueprintId: string): Promise<RunningOperatorJson> {
		return this.httpPost<{ id: string, props: any, gens: any, stream: boolean }, RunningOperatorJson>(
			"/run/",
			{id: blueprintId, props: {}, gens: {}, stream: false},
			(data: any) => {
				if (data.status === "success") {
					return data as RunningOperatorJson;
				}
				throw(data);
			},
			(err: any) => {
				console.error(err);
			},
		);
	}

	public async shutdownBlueprintInstance(accessHandle: string): Promise<{}> {
		return this.httpDelete<{ handle: string }, {}>(
			"/run/",
			{handle: accessHandle},
			(data: any) => {
				if (data.status === "success") {
					return data;
				}
				throw(data);
			},
			(err: any) => {
				console.error(err);
			},
		);
	}

	public async pushInput(instanceUrl: string, inputData: SlangTypeValue): Promise<SlangTypeValue> {
		return this.httpPost<SlangTypeValue, SlangTypeValue>(
			instanceUrl,
			inputData,
			(outputData: SlangTypeValue) => outputData,
			(err: any) => {
				console.error(err);
			},
		);
	}

	private createSocketService(): SocketService {
		const wsUrl = new URL(this.url);

		wsUrl.pathname = "/ws";
		wsUrl.protocol = "ws://";

		const ws = new SocketService(wsUrl.href);

		// If the instance does not yet have a websocket
		// it is the first time it tries to connect
		// thus it makes no sense to signal `reconnected`
		const intitialConnection = this.ws === undefined;
		ws.onConnect().subscribe(() => {
			if (!intitialConnection) {
				this.reconnected.next();
			}
			this.conncected.next();
		});

		// When the wesocket gets disconnected we signal it to reconnect and since the reconnect `subject` is `pipe`d with
		// a delay, we prevent flooding on disconnect.
		//
		// *IMPORTANT*
		// When we signal a reconnect the websocket tries connecting to the specified
		// location if it does not succeed it triggers a WSEvent.CLOSE again which in turn
		// triggers the next deplayed reconnect.
		// Which is why we will see events occuring in the following order:
		// - disconnected
		// - reconnecting
		// ...
		// - disconnected
		// - reconnecting
		// Until it finally connects.
		ws.onDisconnect().subscribe((_v) => {
			this.disconncected.next();
			this.reconnect.next();
		});

		ws.onMessage().subscribe((m) => {
			this.message.next(m);
		});
		return ws;
	}

	private fetch<S, T>(method: string, path: string, data: S, process: (responseParsed: any) => T, error: (error: any) => void): Promise<T> {
		return new Promise<T>((resolve) => {
			const reqInit = (method !== "get") ? {method, body: JSON.stringify(data)} : {};
			fetch(this.url + path, reqInit)
				.then((response: Response) => response.json())
				.then((responseParsed: any) => {
					resolve(process(responseParsed));
				})
				.catch(error);
		});
	}

	private httpGet<ReqT, RespT>(path: string, data: ReqT, process: (responseParsed: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"get",
			path,
			data,
			process,
			error,
		);
	}

	private httpPost<ReqT, RespT>(path: string, data: ReqT, process: (responseParsed: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"post",
			path,
			data,
			process,
			error,
		);
	}

	private httpDelete<ReqT, RespT>(path: string, data: ReqT, process: (responseParsed: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"delete",
			path,
			data,
			process,
			error,
		);
	}

export interface SlangBundle {
	main: string;
	args?: {
		properties: PropertyAssignmentsApiResponse;
		generics: GenericSpecificationsApiResponse;
	};
	blueprints: {
		[id: string]: BlueprintJson,
	};
}
