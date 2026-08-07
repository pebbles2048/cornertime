import assert from 'assert';
import { hasDebugQuery } from './debug';


describe('hasDebugQuery', () => {
    it('returns false for an empty search string', () => {
        assert.equal(hasDebugQuery(''), false);
    });

    it('returns false for a search string without a debug parameter', () => {
        assert.equal(hasDebugQuery('?foo=bar'), false);
    });

    it('returns false when debug appears only as a substring of another parameter', () => {
        assert.equal(hasDebugQuery('?foo=debugx'), false);
        assert.equal(hasDebugQuery('?mode=debugfan'), false);
    });

    it('returns true for a bare ?debug parameter', () => {
        assert.equal(hasDebugQuery('?debug'), true);
    });

    it('returns true when debug has a value', () => {
        assert.equal(hasDebugQuery('?debug=1'), true);
    });

    it('returns true when debug is not the first parameter', () => {
        assert.equal(hasDebugQuery('?a=1&debug'), true);
    });
});
