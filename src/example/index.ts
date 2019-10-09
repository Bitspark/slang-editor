import {SlangEditor} from "..";
import {SlangBundle} from "..";
import {OperatorBoxComponent} from "../slang/ui/components/blackbox";
import {ConnectionComponent} from "../slang/ui/components/connection";
import {WhiteBoxComponent} from "../slang/ui/components/whitebox";

customElements.define("slang-editor", SlangEditor);

// tslint:disable-next-line
//import "../styles/standalone.scss";

const bundle: SlangBundle = {
	main: "1f8dc0f2-a7b8-4eb2-8555-3165bba6e843",
	blueprints: {
		"8b62495a-e482-4a3e-8020-0ab8a350ad2d": {
			id: "8b62495a-e482-4a3e-8020-0ab8a350ad2d",
			meta: {
				name: "value",
				icon: "box-full",
				shortDescription: "emitsaconstantvalueforeachitem",
				description: "",
				docUrl: "https://bitspark.de/slang/docs/operator/value",
				tags: [
					"data",
				],
			},
			geometry: {
				size: {
					width: 240,
					height: 147,
				},
			},
			operators: {

			},
			services: {
				main: {
					in: {
						type: "trigger",
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: 0,
						},
					},
					out: {
						type: "generic",
						generic: "valueType",
					},
				},
			},
			delegates: {

			},
			properties: {
				value: {
					type: "generic",
					generic: "valueType",
				},
			},
			connections: {

			},
		},
		"d1191456-3583-4eaf-8ec1-e486c3818c60": {
			id: "d1191456-3583-4eaf-8ec1-e486c3818c60",
			meta: {
				name: "convert",
				icon: "arrow-alt-right",
				shortDescription: "convertsthetypeofavalue",
				description: "",
				docUrl: "https://bitspark.de/slang/docs/operator/convert",
				tags: [
					"data",
				],
			},
			geometry: {
				size: {
					width: 240,
					height: 147,
				},
			},
			operators: {

			},
			services: {
				main: {
					in: {
						type: "generic",
						generic: "fromType",
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: 0,
						},
					},
					out: {
						type: "generic",
						generic: "toType",
					},
				},
			},
			delegates: {

			},
			properties: {

			},
			connections: {

			},
		},
		"e49369c2-eac2-4dc7-9a6d-b635ae1654f9": {
			id: "e49369c2-eac2-4dc7-9a6d-b635ae1654f9",
			meta: {
				name: "appendfile",
				icon: "file-plus",
				shortDescription: "appendsbinarydatatoafileorcreatesitifnonexistent",
				description: "",
				docUrl: "https://bitspark.de/slang/docs/operator/append-file",
				tags: [
					"file",
				],
			},
			geometry: {
				size: {
					width: 240,
					height: 147,
				},
			},
			operators: {

			},
			services: {
				main: {
					in: {
						type: "map",
						map: {
							content: {
								type: "binary",
							},
							filename: {
								type: "string",
							},
						},
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: 0,
						},
					},
					out: {
						type: "string",
					},
				},
			},
			delegates: {

			},
			properties: {
				newLine: {
					type: "boolean",
				},
			},
			connections: {

			},
		},
		"37ccdc28-67b0-4bb1-8591-4e0e813e3ec1": {
			id: "37ccdc28-67b0-4bb1-8591-4e0e813e3ec1",
			meta: {
				name: "evaluate",
				icon: "function",
				shortDescription: "evaluatesanexpression",
				description: "",
				docUrl: "https://bitspark.de/slang/docs/operator/evaluate",
				tags: [
					"math",
					"boolean",
					"function",
				],
			},
			geometry: {
				size: {
					width: 240,
					height: 147,
				},
			},
			operators: {

			},
			services: {
				main: {
					in: {
						type: "map",
						map: {
							"{variables}": {
								type: "primitive",
							},
						},
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: 0,
						},
					},
					out: {
						type: "primitive",
					},
				},
			},
			delegates: {

			},
			properties: {
				expression: {
					type: "string",
				},
				variables: {
					type: "stream",
					stream: {
						type: "string",
					},
				},
			},
			connections: {

			},
		},
		"7b01fa17-7e11-4275-8d1e-fb1ad5b81c3d": {
			id: "7b01fa17-7e11-4275-8d1e-fb1ad5b81c3d",
			meta: {
				name: "add",
				icon: "plus",
				shortDescription: "addstwonumbersAandBandemitstheirsum",
				description: "",
				docUrl: "https://bitspark.de/slang/docs/operator/add",
				tags: [
					"math",
					"arithmetic",
				],
			},
			geometry: {
				size: {
					width: 305,
					height: 164.25,
				},
			},
			operators: {
				Evaluate: {
					operator: "37ccdc28-67b0-4bb1-8591-4e0e813e3ec1",
					geometry: {
						position: {
							x: -5,
							y: 2.5,
						},
					},
					properties: {
						expression: "a+b",
						variables: [
							"a",
							"b",
						],
					},
					generics: {

					},
				},
			},
			services: {
				main: {
					in: {
						type: "map",
						map: {
							a: {
								type: "number",
							},
							b: {
								type: "number",
							},
						},
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: -5,
						},
					},
					out: {
						type: "number",
					},
				},
			},
			delegates: {

			},
			properties: {

			},
			connections: {
				"a(": [
					"a(Evaluate",
				],
				"b(": [
					"b(Evaluate",
				],
				"Evaluate)": [
					")",
				],
			},
		},
		"1f8dc0f2-a7b8-4eb2-8555-3165bba6e843": {
			id: "1f8dc0f2-a7b8-4eb2-8555-3165bba6e843",
			meta: {
				name: "SimpleHTTPPostExample",
			},
			geometry: {
				size: {
					width: 380,
					height: 314,
				},
			},
			operators: {
				add: {
					operator: "7b01fa17-7e11-4275-8d1e-fb1ad5b81c3d",
					geometry: {
						position: {
							x: -60,
							y: -45.5,
						},
					},
					properties: {

					},
					generics: {

					},
				},
				appendfile: {
					operator: "e49369c2-eac2-4dc7-9a6d-b635ae1654f9",
					geometry: {
						position: {
							x: 30,
							y: 74.5,
						},
					},
					properties: {
						newLine: true,
					},
					generics: {

					},
				},
				convert: {
					operator: "d1191456-3583-4eaf-8ec1-e486c3818c60",
					geometry: {
						position: {
							x: 5,
							y: 12.5,
						},
					},
					properties: {

					},
					generics: {
						fromType: {
							type: "number",
						},
						toType: {
							type: "binary",
						},
					},
				},
				value: {
					operator: "8b62495a-e482-4a3e-8020-0ab8a350ad2d",
					geometry: {
						position: {
							x: 100,
							y: -52.5,
						},
					},
					properties: {
						value: "slang-add.txt",
					},
					generics: {
						valueType: {
							type: "string",
						},
					},
				},
			},
			services: {
				main: {
					in: {
						type: "map",
						map: {
							gen_a_82: {
								type: "number",
							},
							gen_b_36: {
								type: "number",
							},
						},
					},
					geometry: {
						in: {
							position: 0,
						},
						out: {
							position: 0,
						},
					},
					out: {
						type: "map",
						map: {
							gen__80: {
								type: "number",
							},
						},
					},
				},
			},
			delegates: {

			},
			properties: {

			},
			connections: {
				"gen_a_82(": [
					"a(add",
					"(value",
				],
				"gen_b_36(": [
					"b(add",
				],
				"add)": [
					")gen__80",
					"(convert",
				],
				"convert)": [
					"content(appendfile",
				],
				"value)": [
					"filename(appendfile",
				],
			},
		},
	},
};

const slangEditor = document.getElementById("main") as SlangEditor;
if (slangEditor) {
	const blueprint = slangEditor.loadBundle(bundle);
	slangEditor.displayBlueprint(blueprint);
	slangEditor.selected.subscribe((comp: WhiteBoxComponent|OperatorBoxComponent|ConnectionComponent|null) => {
		console.log("--> selected:", comp);
	});
}
