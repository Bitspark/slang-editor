import {StreamType} from "../../src/slang/core/abstract/stream";

// tslint:disable:no-magic-numbers

describe("A stream type", () => {

	it("returns correct depth", () => {
		const baseStream = new StreamType(null, null);
		expect(baseStream.getStreamDepth()).toBe(1);

		const stream1 = new StreamType(baseStream, null);
		expect(stream1.getStreamDepth()).toBe(2);

		const stream2 = new StreamType(stream1, null);
		expect(stream2.getStreamDepth()).toBe(3);
	});

});
