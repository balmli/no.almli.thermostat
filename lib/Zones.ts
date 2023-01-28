import {HomeyAPIV2} from "homey-api";
import {Zone} from "./types";

export class Zones {

    logger: any;
    zonesAsTree?: Zone;

    constructor(zonesAsMap?: { [key: string]: HomeyAPIV2.ManagerZones.Zone; }, logger?: any) {
        this.logger = logger;
        this.registerZones(zonesAsMap);
    }

    destroy() {
    }

    /**
     * Return zones as a tree structure.
     */
    getZones(): Zone | undefined {
        return this.zonesAsTree;
    }

    /**
     * Return one zone by zone id.
     * @param id
     */
    getZone(id: string | undefined): Zone | undefined {
        return id ? Zones.find(this.zonesAsTree, id) : undefined;
    }

    /**
     * Register zones from a map of zones.
     * @param zonesAsMap
     */
    registerZones(zonesAsMap?: { [key: string]: HomeyAPIV2.ManagerZones.Zone; }): void {
        if (zonesAsMap) {
            this.zonesAsTree = Zones.createTree(zonesAsMap);
            this.logger?.verbose(`Updated zones. (${this.getZonesAsList(this.zonesAsTree).length} zones)`);
        }
    }

    /**
     * Create or update a zone.
     * @param zone
     */
    createOrUpdateZone(zone: HomeyAPIV2.ManagerZones.Zone) {
        if (zone) {
            const updatedZone = Zones.mapItem(zone);
            const zonesAsList: Zone[] = this.getZonesAsList(this.zonesAsTree);
            const current = zonesAsList.find(z => z.id === zone.id);
            if (current) {
                current.name = updatedZone.name;
                current.parent = updatedZone.parent;
            } else {
                zonesAsList.push(updatedZone);
            }
            const t = Zones.toSubTree(zonesAsList);
            this.zonesAsTree = t[0];
            this.logger?.debug(`Updated zone: ${zone.id}. (${this.getZonesAsList(this.zonesAsTree).length} zones)`);
        }
    }

    /**
     * Delete a zone.
     * @param zoneId
     */
    deleteZone(zoneId: string) {
        if (zoneId) {
            const zonesAsList: Zone[] = this.getZonesAsList(this.zonesAsTree);
            const idx = zonesAsList.findIndex(z => z.id === zoneId);
            if (idx >= 0) {
                zonesAsList.splice(idx, 1);
                const t = Zones.toSubTree(zonesAsList);
                this.zonesAsTree = t[0];
                this.logger?.debug(`Deleted zone: ${zoneId}. (${this.getZonesAsList(this.zonesAsTree).length} zones)`);
            }
        }
    }

    /**
     * Return the tree as a list of zones.
     * @param tree
     */
    getZonesAsList(tree?: Zone): Zone[] {
        const arr: Zone[] = [];
        if (tree) {
            Zones.convertToList(tree, arr);
        }
        return arr;
    }

    /**
     * Return sub zones for a zone.
     *
     * @param tree
     * @param parentLevel true to return parent zones
     * @param oneLevelDown true to return children zones
     */
    getParentAndSubZones(tree?: Zone, parentLevel?: boolean, oneLevelDown?: boolean): Zone[] {
        const arr: Zone[] = [];
        if (tree) {
            if (parentLevel && tree.parent) {
                const parentZone = this.getZone(tree.parent);
                if (parentZone) {
                    arr.push(parentZone);
                }
            }
            arr.push(tree);
            if (oneLevelDown && tree.children) {
                arr.push(...tree.children);
            }
        }
        return arr;
    }

    private static createTree(zonesAsMap: { [key: string]: HomeyAPIV2.ManagerZones.Zone; }): Zone {
        const t = Zones.toSubTree(Zones.asList(zonesAsMap));
        return t[0];
    }

    private static asList(zonesAsMap: { [key: string]: HomeyAPIV2.ManagerZones.Zone; }): Zone[] {
        const ret: Zone[] = [];
        for (const key in zonesAsMap) {
            if (zonesAsMap.hasOwnProperty(key)) {
                ret.push(Zones.mapItem(zonesAsMap[key]));
            }
        }
        return ret;
    }

    private static mapItem(i: any): Zone {
        const z = new Zone();
        z.id = i.id;
        z.name = i.name;
        z.parent = i.parent;
        return z;
    }

    private static convertToList(root: Zone, arr: Zone[]) {
        arr.push(root);
        if (root.children) {
            for (let z of root.children) {
                Zones.convertToList(z, arr);
            }
        }
    }

    private static toSubTree(items: Zone[], id: null | string = null): Zone[] {
        return items
            .filter((item: any) => item.parent === id)
            .map((item: any) => ({...item, children: Zones.toSubTree(items, item.id)}));
    }

    private static find(root?: Zone, id?: string): Zone | undefined {
        return (!root || root.id === id) ? root
            : root.children?.reduce((result: any, n: any) => result || Zones.find(n, id), undefined);
    }

}