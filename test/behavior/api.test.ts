// tslint:disable:no-implicit-dependencies
import {WS} from "jest-websocket-mock";

import {ApiService, MessageTopic} from "../../src/slang/definitions/api";

// tslint:disable:no-magic-numbers

describe("ApiService", () => {
	let api: ApiService;
	let server: WS;

	beforeEach(async () => {
		server = new WS("ws://localhost:1234/ws");
		fetchMock.resetMocks();
	});

	afterEach(() => {
		WS.clean();
	});

	it("return no blueprints on errornous data", () => {
		api = new ApiService("http://localhost:1234");
		fetchMock.mockResponseOnce(JSON.stringify({data: "12345"}));
		expect(api.getBlueprints()).resolves.toBe({});
		expect(fetchMock.mock.calls.length).toEqual(1);
	});

	it("it notifies subscribes when the services connects", (done) => {
		api = new ApiService("http://localhost:1234");
		api.subscribeConnected(() => {
			done();
		});
	});

	it("it notifies subscribes when the services disconnects on close", (done) => {
		api = new ApiService("http://localhost:1234");
		api.subscribeDisconnected(() => {
			done();
		});
		expect(server.connected).resolves.toBeTruthy();
		server.close();
	});

	it("it notifies subscribes when the services disconnects on error", (done) => {
		api = new ApiService("http://localhost:1234");
		api.subscribeDisconnected(() => {
			done();
		});
		expect(server.connected).resolves.toBeTruthy();
		server.error();
	});

	it("it notifies subscribes when the services reconnects", (done) => {
		api = new ApiService("http://localhost:1234");
		api.subscribeReconnecting(() => {
			done();
		});
		expect(server.connected).resolves.toBeTruthy();
		server.close();
		server = new WS("ws://localhost:1234/ws");
		expect(server.connected).resolves.toBeTruthy();
	});

	it("it notifies subscribes when the services has reconnected", (done) => {
		api = new ApiService("http://localhost:1234");
		api.subscribeReconnected(() => {
			done();
		});
		expect(server.connected).resolves.toBeTruthy();
		server.close();
		server = new WS("ws://localhost:1234/ws");
		expect(server.connected).resolves.toBeTruthy();
	});

	it("it does not fire reconnected on first connect", () => {
		api = new ApiService("http://localhost:1234");
		const mockFn = jest.fn();
		api.subscribeReconnected(() => {
			mockFn();
		});
		return server.connected.then(() => {
			expect(mockFn).toBeCalledTimes(0);
		});
	});

	it("it ignores received but invalid messages", (done) => {
		api = new ApiService("http://localhost:1234");
		const mockFn = jest.fn();
		api.subscribeMessage((_) => {
			mockFn();
		});
		server.send("test");
		server.closed.then(() => {
			expect(mockFn).toBeCalledTimes(0);
			done();
		});
		server.close();
	});

	it("it receives messages with topic", (done) => {
		api = new ApiService("http://localhost:1234");
		api.subscribeMessage((msg) => {
			expect(msg).toMatchObject({topic: "Port", payload: "..."});
			done();
		});
		server.send(JSON.stringify({topic: "Port", payload: "..."}));
	});

	it("it receives messages of specific topic", (done) => {
		api = new ApiService("http://localhost:1234");
		api.getTopicObserver(MessageTopic.Port).subscribe((payload) => {
			expect(payload).toBe("...");
			done();
		});
		server.send(JSON.stringify({topic: "Port", payload: "..."}));
	});

	it("it ignores messages of unknown topic", (done) => {
		api = new ApiService("http://localhost:1234");
		const mockFn = jest.fn();
		api.getTopicObserver(MessageTopic.Port).subscribe((_) => {
			mockFn();
		});
		server.send(JSON.stringify({topic: "XXXX", payload: "..."}));
		server.closed.then(() => {
			expect(mockFn).toBeCalledTimes(0);
			done();
		});
		server.close();
	});
});
