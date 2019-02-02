import {TypeIdentifier} from "../slang/custom/type";

export namespace Styles {

	const typeColors: { [key in TypeIdentifier | "ghost"]: string } = {
		[TypeIdentifier.Number]: "#2e49b3",
		[TypeIdentifier.String]: "#a52e2e",
		[TypeIdentifier.Boolean]: "#cb8000",
		[TypeIdentifier.Binary]: "#83a91d",
		[TypeIdentifier.Primitive]: "#018b8a",
		[TypeIdentifier.Generic]: "#b25db2",
		[TypeIdentifier.Unspecified]: "#ffeff2",
		[TypeIdentifier.Trigger]: "rgba(151, 151, 151, 0.5)",
		[TypeIdentifier.Stream]: "transparent",
		[TypeIdentifier.Map]: "transparent",
		["ghost"]: "rgba(178, 93, 178, 0.5)",
	};

	export class Port {
		public static width = 8;
		public static height = 8;
	}

	export namespace Connection {
		class BaseConnection {
			public static strokeWidth = 1;
			public static vectorEffect = "default";
			public static stroke = (type: TypeIdentifier | "ghost"): string => typeColors[type];
		}

		export class OrdinaryConnection extends BaseConnection {
			public static strokeOpacity = 1;

		}

		export class GhostConnection extends BaseConnection {
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
			top: "translate(0 -20)",
			right: "translate(-40 0)",
			bottom: "translate(0 20)",
			left: "translate(40 0)",
		};
	}

	export class BlackBox {
		public static rx = 6;
		public static ry = 6;
		public static size = {width: 80, height: 49};
		public static filter = {
			name: "dropShadow",
			args: {
				dx: 0,
				dy: 0,
				blur: 1,
			},
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
		public static blackBox = {
			size: BlackBox.size,
			attrs: {
				body: {
					rx: BlackBox.rx,
					ry: BlackBox.ry,
					class: "sl-rectangle",
				},
				label: {
					class: "sl-label",
					fontSize: 10,
				},
			},
		};

		public static outer = {
			attrs: {
				root: {
					class: "joint-cell joint-element sl-outer",
				},
				body: {
					rx: Outer.rx,
					ry: Outer.ry,
					class: "sl-rectangle",
					cursor: "default",
					filter: Outer.filter,
				},
			},
		};
	}
}
