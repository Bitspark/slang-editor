import {TypeIdentifier} from "../app/custom/type";

export namespace Styles {

	const TypeColors: { [key in TypeIdentifier]: string } = {
		// [TypeIdentifier.Unspecified]: "#ffeff2",
		[TypeIdentifier.Number]: "#2e49b3",
		[TypeIdentifier.String]: "#a52e2e",
		[TypeIdentifier.Boolean]: "#cb8000",
		[TypeIdentifier.Binary]: "#83a91d",
		[TypeIdentifier.Primitive]: "#018b8a",
		[TypeIdentifier.Trigger]: "#979797",
		[TypeIdentifier.Generic]: "#b25db2",
		[TypeIdentifier.Stream]: "transparent",
		[TypeIdentifier.Map]: "transparent",
	};

	export class Port {
		public static width = 8;
		public static height = 8;
	}

	export namespace Connection {
		class Connection {
			public static strokeWidth = 1;
			public static stroke = (type: TypeIdentifier): string => TypeColors[type];
			public static vectorEffect = "default";
		}

		export class Ordinary extends Connection {
			public static strokeOpacity = 1;

		}

		export class Ghost extends Connection {
			public static strokeOpacity = 0.3;
		}
	}

	export class PortGroup {
		public static portSpacing = 10;
		public static TranslationIn = 4;
		public static TranslationOut = -4;
	}

	export class BlueprintPort {
		public static transformations = {
			"top": "translate(0 -20)",
			"right": "translate(-40 0)",
			"bottom": "translate(0 20)",
			"left": "translate(40 0)",
		};
	}

	export class BlackBox {
		public static rx = 6;
		public static ry = 6;
		public static size = {width: 120, height: 74};
		public static filter = {
			name: "dropShadow",
			args: {
				dx: 0,
				dy: 0,
				blur: 1,
			}
		};
	}

	export class Outer {
		public static rx = 24;
		public static ry = 24;
		public static filter = {
			name: "innerShadow",
			args: {
				dx: 0,
				dy: 0,
				blur: 2,
			},
		};
	}

	export class Defaults {
		public static BlackBox = {
			size: Styles.BlackBox.size,
			attrs: {
				body: {
					rx: Styles.BlackBox.rx,
					ry: Styles.BlackBox.ry,
					class: "sl-rectangle",
				},
				label: {
					class: "sl-label",
					fontSize: 10,
				},
			},
		};

		public static Outer = {
			attrs: {
				root: {
					class: "joint-cell joint-element sl-outer",
				},
				body: {
					rx: Styles.Outer.rx,
					ry: Styles.Outer.ry,
					class: "sl-rectangle",
					cursor: "default",
					filter: Styles.Outer.filter,
				},
			},
		};
	}
}