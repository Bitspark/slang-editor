import {GenericSpecifications} from "../../src/slang/core/abstract/utils/generics";
import {PropertyAssignments, PropertyEvaluator, PropertyModel} from "../../src/slang/core/abstract/utils/properties";
import {SlangType, TypeIdentifier} from "../../src/slang/definitions/type";

describe("A PropertyAssignment Qet", () => {
    let props: PropertyAssignments;
    beforeAll(() => {
        const gens = new GenericSpecifications([]);
        props = new PropertyAssignments([
            new PropertyModel("Id", SlangType.newNumber()),
            new PropertyModel("Message", SlangType.newString()),
            new PropertyModel("Colors", SlangType.newStream(TypeIdentifier.String)),
            new PropertyModel("Person",
                SlangType.newMap()
                    .addMapSub("name", SlangType.newString())
                    .addMapSub("alias", SlangType.newString())
            ),
            new PropertyModel("Movies",
                SlangType.newStream().setStreamSub(
                    SlangType.newMap()
                        .addMapSub("title", SlangType.newString())
                        .addMapSub("year", SlangType.newNumber())
                )
            ),
        ], gens);
        props.get("Id").assign(1)
        props.get("Message").assign("follow the white rabbit")
        props.get("Person").assign({
            "name": "Thomas Anderson",
            "alias": "Neo",
        })
        props.get("Colors").assign([
            "green",
            "blue",
        ])
        props.get("Movies").assign([
            {
                title: "The Matrix",
                year: 1999,
            },
            {
                title: "The Matrix Reloaded",
                year: 2003,
            },
            {
                title: "The Matrix Revolutions",
                year: 2003,
            },
            {
                title: "The Matrix Resurrections",
                year: 2021,
            },

        ])
    })

    it("returns Id", () => {
        expect(props.Qet("Id")!.values).toEqual([1])
    })

    it("returns Message", () => {
        expect(props.Qet("Message")!.values).toEqual(["follow the white rabbit"])
    })

    it("returns Person.name", () => {
        expect(props.Qet("Person.name")!.values).toEqual(["Thomas Anderson"])
    })

    it("returns Movies.#.title", () => {
        expect(props.Qet("Movies.#.title")!.values).toEqual([
            "The Matrix",
            "The Matrix Reloaded",
            "The Matrix Revolutions",
            "The Matrix Resurrections",
        ])
    })
})

describe("A PropertyEvaluator", () => {

    beforeEach(async () => {
    });

    it("can interpolate simple string", () => {
        const gens = new GenericSpecifications([]);
        const props = new PropertyAssignments([
            new PropertyModel("message", SlangType.newString())
        ], gens);

        props.get("message").assign("Good");

        expect(PropertyEvaluator.expand("this is {message}", props)).toContain("this is Good")
    });

    it("can interpolate simple array by multiplying", () => {
        const gens = new GenericSpecifications([]);
        const props = new PropertyAssignments([
            new PropertyModel("colors", SlangType.newStream())
        ], gens);

        props.get("colors").assign(["purple", "green"]);

        expect(PropertyEvaluator.expand("my favorite color is {colors}", props)).toEqual(
            ["my favorite color is purple", "my favorite color is green"])
    });

    it("can interpolate value accessed by json path", () => {
        const gens = new GenericSpecifications([]);
        const props = new PropertyAssignments([
            new PropertyModel("user", SlangType.newMap()
                .addMapSub("name", SlangType.newString())
                .addMapSub("lastName", SlangType.newString()))
        ], gens);

        props.get("user").assign({
            "name": "John",
            "lastName": "Doe",
            "email": "john@slang.io",
        });

        expect(PropertyEvaluator.expand("Hello {user.name}", props)).toEqual(
            ["Hello John"])
    });
});
