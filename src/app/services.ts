import {SlangTypeValue} from "../slang/definitions/type";
import {
	BlueprintsJson,
	BlueprintJson,
	BlueprintApiResponse,
	RunningOperatorJson,
	RunOperatorJson
} from "../slang/definitions/api";
import {BlueprintModel} from "../slang/core/models";

export class ApiService {

	private readonly url: string;

	constructor(host: string) {
		this.url = host;
		//this.ws = this.createSocketService();
	}

	public async getBlueprints(): Promise<BlueprintsJson> {
		return this.httpGet<{}, BlueprintsJson>(
			"/operator/",
			{},
			(data: any) => {
				const bpdef: BlueprintApiResponse[] = (data as { objects: any }).objects;
				return {
					elementary: bpdef.filter((bp) => bp.type === "elementary").map((bp) => bp.def),
					library: bpdef.filter((bp) => bp.type === "library").map((bp) => bp.def),
					local: bpdef.filter((bp) => bp.type === "local").map((bp) => bp.def),
				};
			},
			(err: any) => {
				console.error(err);
			},
		);
	}

	public async getRunningOperators(): Promise<RunningOperatorJson[]> {
		return this.httpGet<{}, RunningOperatorJson[]>(
			"/run/",
			{},
			(data: any) => {
				return (data as { objects: RunningOperatorJson[] }).objects;
			},
			(err: any) => {
				console.error(err);
			},
		);
	}

	public async startOperator(blueprint: BlueprintModel): Promise<RunningOperatorJson> {
		return this.httpPost<RunOperatorJson, RunningOperatorJson>(
			"/run/",
			{blueprint: blueprint.uuid},
			(data: {object: RunningOperatorJson} ) => data.object,
			(err: any) => {
				console.error(err);
			},
		);
	}

	public async storeBlueprint(blueprintDefJSON: BlueprintJson): Promise<any> {
		const process = (data: any) => {
			if (data) {
				console.error(data);
				return false;
			}
			return true;
		};
		const error = (err: any) => {
			console.error(err);
		};

		return new Promise<boolean>((resolve) => {
			const reqInit = {method: "post", body: JSON.stringify(blueprintDefJSON)};
			fetch(`${this.url}/operator/def/`, reqInit)
				.then((response: Response) => response.json())
				.then((data: any) => {
					resolve(process(data));
					console.log("SAVED")
				})
				.catch(error);
		});
	}

	public async pushInput(instanceUrl: string, inputData: SlangTypeValue): Promise<SlangTypeValue> {
		return this.httpPost<SlangTypeValue, SlangTypeValue>(
			instanceUrl,
			inputData,
			(outputData: SlangTypeValue) => outputData,
			(err: any) => {
				console.error(err);
			},
		);
	}

	private fetch<S, T>(method: string, path: string, data: S, process: (responseParsed: any) => T, error: (error: any) => void): Promise<T> {
		return new Promise<T>((resolve) => {
			const reqInit = (method !== "get") ? {method, body: JSON.stringify(data)} : {};
			fetch(this.url + path, reqInit)
				.then((response: Response) => response.json())
				.then((responseParsed: any) => {
					resolve(process(responseParsed));
				})
				.catch(error);
		});
	}

	private httpGet<ReqT, RespT>(path: string, data: ReqT, process: (responseParsed: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"get",
			path,
			data,
			process,
			error,
		);
	}

	private httpPost<ReqT, RespT>(path: string, data: ReqT, process: (responseParsed: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"post",
			path,
			data,
			process,
			error,
		);
	}

    //@ts-ignore
	private httpDelete<ReqT, RespT>(path: string, data: ReqT, process: (responseParsed: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"delete",
			path,
			data,
			process,
			error,
		);
	}
}
