import { ApiService } from "../../src/slang/definitions/api";

// tslint:disable:no-magic-numbers

describe("ApiService", () => {
	let api: ApiService;

	beforeEach(async () => {
        fetchMock.resetMocks()
        api = new ApiService("http://something.tld")
	});

	it("return no blueprints on errornous data", () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: '12345' }))
        expect(api.getBlueprints()).resolves.toBe({})
        expect(fetchMock.mock.calls.length).toEqual(1)
	});
});
