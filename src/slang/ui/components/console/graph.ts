import m, {CVnode, CVnodeDOM} from "mithril";
import * as Plotly from "plotly.js";
import {Config, ScatterData} from "plotly.js";

import {TypeIdentifier} from "../../../definitions/type";
import {ConsoleValueType, Output} from "../console";

type GraphType = [{ name: string, data: [{ x: string, y: string }] }];

const PLOTLY_CONFIG: Partial<Config> = {
	modeBarButtonsToRemove: ["sendDataToCloud"],
	displaylogo: false,
};

export const GRAPH_VALUE_TYPE: ConsoleValueType<GraphType> = {
	typeDef: {
		type: TypeIdentifier.Stream,
		stream: {
			type: TypeIdentifier.Map,
			map: {
				name: {type: TypeIdentifier.String},
				data: {
					type: TypeIdentifier.Stream,
					stream: {
						type: TypeIdentifier.Map,
						map: {
							x: {type: TypeIdentifier.Primitive},
							y: {type: TypeIdentifier.Primitive},
						},
					},
				},
			},
		},
	},

	output: {
		oncreate({attrs, dom}: CVnodeDOM<Output.ValueTypeAttrs<GraphType>>) {
			const graphData = attrs.value.map(({name, data}) => {
				return {
					name,
					x: data.map(({x}) => x),
					y: data.map(({y}) => y),
					mode: "lines+markers",
				} as Partial<ScatterData>;
			});
			const layout = {
				width: 500,
				height: 500,
				xaxis: {
					showgrid: true,
					zeroline: true,
				},
				yaxis: {
					showline: true,
				},
			};
			Plotly.plot(dom as HTMLElement, graphData, layout, PLOTLY_CONFIG);
			m.redraw();
		},

		view({}: CVnode<Output.ValueTypeAttrs<GraphType>>): m.Children | void | null {
			return m(".sl-graph");
		},
	},
};
