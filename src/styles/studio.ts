import {TypeIdentifier} from "../slang/core/definitions/type";

export namespace Styles {

	const typeColors: { [key in TypeIdentifier]: string } = {
		// [TypeIdentifier.Unspecified]: "#ffeff2",
		[TypeIdentifier.Number]: "#2e49b3",
		[TypeIdentifier.String]: "#a52e2e",
		[TypeIdentifier.Boolean]: "#cb8000",
		[TypeIdentifier.Binary]: "#83a91d",
		[TypeIdentifier.Primitive]: "#018b8a",
		[TypeIdentifier.Trigger]: "rgba(151, 151, 151, 0.5)",
		[TypeIdentifier.Generic]: "rgba(178, 93, 178, 0.5)",
		[TypeIdentifier.Stream]: "transparent",
		[TypeIdentifier.Map]: "transparent",
	};

	export class Port {
		public static width = 8;
		public static height = 8;
	}

	export class Connection {
		public static strokeWidth = 1;
		public static vectorEffect = "default";
		public static stroke = (type: TypeIdentifier): string => typeColors[type];
	}

	export namespace Connection {

		export class Ordinary extends Connection {
			public static strokeOpacity = 1;

		}

		export class Ghost extends Connection {
			public static strokeOpacity = 0.3;
		}
	}

	export class PortGroup {
		public static portSpacing = 10;
		public static translationIn = 4;
		public static translationOut = -4;
	}

	export class BlueprintPort {
		public static transformations = {
			bottom: "translate(0 20)",
			left: "translate(40 0)",
			right: "translate(-40 0)",
			top: "translate(0 -20)",
		};
	}

	export class BlackBox {
		public static rx = 6;
		public static ry = 6;
		public static size = {width: 80, height: 49};
		public static filter = {
			args: {
				blur: 1,
				dx: 0,
				dy: 0,
			},
			name: "dropShadow",
		};
	}

	export class Outer {
		public static rx = 24;
		public static ry = 24;
		public static filter = {
			args: {
				blur: 2,
				dx: 0,
				dy: 0,
			},
			name: "innerShadow",
		};
	}

	export class Defaults {
		public static blackBox = {
			attrs: {
				body: {
					class: "sl-rectangle",
					rx: BlackBox.rx,
					ry: BlackBox.ry,
				},
				label: {
					class: "sl-label",
					fontSize: 10,
				},
			},
			size: BlackBox.size,
		};

		public static outer = {
			attrs: {
				body: {
					class: "sl-rectangle",
					cursor: "default",
					filter: Outer.filter,
					rx: Outer.rx,
					ry: Outer.ry,
				},
				root: {
					class: "joint-cell joint-element sl-outer",
				},
			},
		};
	}
}
