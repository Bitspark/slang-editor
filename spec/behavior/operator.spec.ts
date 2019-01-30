describe("A suite", () => {
	it("set contains value", () => {
		const a = new Set<string>();
		a.add("test");
		expect(a).toContain("test");
	});
});