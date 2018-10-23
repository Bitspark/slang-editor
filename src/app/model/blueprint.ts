import {BehaviorSubject, Subject} from "rxjs";

export class BlueprintModel {

    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);

    private readonly hierarchy: Array<string> = [];

    constructor(private fullName: string) {
        this.hierarchy = fullName.split('.');
    }

    public getFullName(): string {
        return this.fullName;
    }

    public getPackageName(level: number): string {
        return this.hierarchy[level];
    }

    public getPackageDepth(): number {
        return this.hierarchy.length;
    }

    public getShortName(): string {
        return this.hierarchy[this.hierarchy.length - 1];
    }

    // Actions

    public select() {
        if (!this.selected.getValue()) {
            this.selected.next(true);
        }
    }

    public deselect() {
        if (this.selected.getValue()) {
            this.selected.next(false);
        }
    }

    public delete() {
        this.removed.next();
    }

    // Subscriptions

    public subscribeSelectChanged(cb: (selected: boolean) => void): void {
        this.selected.subscribe(cb);
    }

    public subscribeDeleted(cb: () => void): void {
        this.removed.subscribe(cb);
    }

}