import {describe, expect, it} from 'vitest';
import {Zones} from '../lib/Zones';

const zonesMap = () => ({
    root: {id: 'root', name: 'Home', parent: null},
    living: {id: 'living', name: 'Living room', parent: 'root'},
    kitchen: {id: 'kitchen', name: 'Kitchen', parent: 'root'},
    pantry: {id: 'pantry', name: 'Pantry', parent: 'kitchen'},
});

describe('Zones', () => {
    it('builds a hierarchy independent of input order', () => {
        const zones = new Zones(zonesMap() as any);
        expect(zones.getZones()).toMatchObject({
            id: 'root',
            children: [
                {id: 'living', children: []},
                {id: 'kitchen', children: [{id: 'pantry', children: []}]},
            ],
        });
    });

    it('finds zones recursively and flattens in tree order', () => {
        const zones = new Zones(zonesMap() as any);
        expect(zones.getZone('pantry')?.name).toBe('Pantry');
        expect(zones.getZone('missing')).toBeUndefined();
        expect(zones.getZonesAsList(zones.getZones()).map(zone => zone.id)).toEqual([
            'root',
            'living',
            'kitchen',
            'pantry',
        ]);
    });

    it('returns the requested parent, current zone and direct children', () => {
        const zones = new Zones(zonesMap() as any);
        const kitchen = zones.getZone('kitchen');
        expect(zones.getParentAndSubZones(kitchen, true, true).map(zone => zone.id)).toEqual([
            'root',
            'kitchen',
            'pantry',
        ]);
        expect(zones.getParentAndSubZones(kitchen, false, false).map(zone => zone.id)).toEqual(['kitchen']);
    });

    it('adds a zone and updates an existing zone including reparenting', () => {
        const zones = new Zones(zonesMap() as any);
        zones.createOrUpdateZone({id: 'office', name: 'Office', parent: 'root'} as any);
        zones.createOrUpdateZone({id: 'living', name: 'Lounge', parent: 'kitchen'} as any);
        expect(zones.getZone('office')?.parent).toBe('root');
        expect(zones.getZone('living')).toMatchObject({name: 'Lounge', parent: 'kitchen'});
        expect(zones.getZone('kitchen')?.children?.map(zone => zone.id)).toEqual(['living', 'pantry']);
    });

    it('deletes a leaf zone and ignores unknown ids', () => {
        const zones = new Zones(zonesMap() as any);
        zones.deleteZone('pantry');
        zones.deleteZone('missing');
        expect(zones.getZone('pantry')).toBeUndefined();
        expect(zones.getZonesAsList(zones.getZones())).toHaveLength(3);
    });

    it('handles an uninitialized registry', () => {
        const zones = new Zones();
        expect(zones.getZones()).toBeUndefined();
        expect(zones.getZone(undefined)).toBeUndefined();
        expect(zones.getZonesAsList()).toEqual([]);
        expect(zones.getParentAndSubZones()).toEqual([]);
    });
});
