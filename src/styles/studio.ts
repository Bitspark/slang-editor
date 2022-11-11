import {TypeIdentifier} from "../slang/definitions/type";
// tslint:disable-next-line
import "@fortawesome/fontawesome-free/js/all";

export namespace Styles {

	const typeColors: { [key in TypeIdentifier | "ghost"]: string } = {
		[TypeIdentifier.Number]: "#2e49b3",
		[TypeIdentifier.String]: "#a52e2e",
		[TypeIdentifier.Boolean]: "#ff764d",
		[TypeIdentifier.Binary]: "#83a91d",
		[TypeIdentifier.Primitive]: "#209CEE",
		[TypeIdentifier.Generic]: "#b25db2",
		[TypeIdentifier.Unspecified]: "#ffeff2",
		[TypeIdentifier.Trigger]: "rgba(151, 151, 151, 0.5)",
		[TypeIdentifier.Stream]: "transparent",
		[TypeIdentifier.Map]: "transparent",
		["ghost"]: "rgba(178, 93, 178, 0.5)",
	};

	export class Port {
		public static width = 14;
		public static height = 8;
	}

	export namespace Connection {
		class BaseConnection {
			public static strokeWidth = 6;
			public static vectorEffect = "default";
			public static stroke = (type: TypeIdentifier | "ghost"): string => typeColors[type];
		}

		export class OrdinaryConnection extends BaseConnection {
			public static strokeOpacity = 0.7;

		}

		export class GhostConnection extends BaseConnection {
			public static strokeOpacity = 0.3;
		}
	}

	export class PortGroup {
		public static portSpacing = Port.width;
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
		public static rx = 2;
		public static ry = 2;
		public static size = {width: 80, height: 49};
		public static filter = {
			name: "dropShadow",
			args: {
				dx: 2,
				dy: 2,
				blur: 8,
				color: "#16214a14",
			},
		};
	}

	export class Outer {
		public static rx = 5;
		public static ry = 5;
		public static size = {width: 240, height: 147};
		public static filter = {};
	}

	export class Defaults {
		public static blackBox = {
			size: BlackBox.size,
			attrs: {
				body: {
					rx: BlackBox.rx,
					ry: BlackBox.ry,
					class: "sl-rectangle",
					filter: BlackBox.filter,
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
				},
			},
		};
	}
}
