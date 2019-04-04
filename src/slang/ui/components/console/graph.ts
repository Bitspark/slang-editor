import m, {CVnode, CVnodeDOM} from "mithril";
import * as Plotly from "plotly.js";
import {Config, ScatterData} from "plotly.js";

import {ConsoleValueType, Output} from "../console";

type GraphType = [{ name: string, data: [{ x: string, y: string }] }];

const PLOTLY_CONFIG: Partial<Config> = {
	modeBarButtonsToRemove: ["sendDataToCloud"],
	displaylogo: false,
};

export const GRAPH_VALUE_TYPE: ConsoleValueType<GraphType> = {
	typeDef: {
		type: "stream",
		stream: {
			type: "map",
			map: {
				name: {type: "string"},
				data: {
					type: "stream",
					stream: {
						type: "map",
						map: {
							x: {type: "primitive"},
							y: {type: "primitive"},
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
