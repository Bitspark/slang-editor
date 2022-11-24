import {SlangTypeValue} from "../slang/definitions/type";
import {
	BlueprintsJson,
	BlueprintJson,
	BlueprintApiResponse,
	RunningOperatorJson,
	RunOperatorJson
} from "../slang/definitions/api";
import {BlueprintModel} from "../slang/core/models";
import {RunningOperator} from "../slang/core/models/blueprint";
import {Observable, Subject} from "rxjs";
import {delay, filter, map} from "rxjs/operators";

function handleError(e: unknown) {
	console.error(e)
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
			handleError,
		);
	}

	public async getRunningOperators(): Promise<RunningOperatorJson[]> {
		return this.httpGet<{}, RunningOperatorJson[]>(
			"/run/",
			{},
			(data: any) => {
				return (data as { objects: RunningOperatorJson[] }).objects;
			},
			handleError,
		);
	}

	public async runOperator(blueprint: BlueprintModel): Promise<RunningOperatorJson> {
		return this.httpPost<RunOperatorJson, RunningOperatorJson>(
			"/run/",
			{blueprint: blueprint.uuid},
			(data: {object: RunningOperatorJson} ) => data.object,
			handleError,
		);
	}

	public async sendData(runningOperator: RunningOperator, data: SlangTypeValue): Promise<null> {
		return this.httpPost<SlangTypeValue, null>(
			runningOperator.url,
			data,
			() => null,
			handleError,
		);
	}

	public async stopOperator(runningOperator: RunningOperator): Promise<null> {
		return this.httpDelete<{}, null>(
			runningOperator.url,
			{},
			() => null,
			handleError,
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
		const error = handleError;

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
				.then((response: Response) => response.status !== 204 ? response.json() : {})
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

    //@ts-ignore
	private httpDelete<ReqT, RespT>(path: string, data: ReqT, process: (responseParsed: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"delete",
			path,
			data,
			process,
			error,
		);
	}
}

export enum MessageTopic {
	Port = "Port",
}

export type MessagePayload = any;

export interface Message {
	topic: MessageTopic;
	payload: MessagePayload;
}

const enum WSEvent {
	CLOSE = "close",
	ERROR = "error",
	MESSAGE = "message",
	OPEN = "open",
}

export class SocketService {
	/*
		restored from commit
		https://github.com/Bitspark/slang-editor/commit/1d9e0161491c8027f9c2840d43257e84dfdae431
	 */
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
