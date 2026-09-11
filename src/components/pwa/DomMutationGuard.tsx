'use client';

import { useEffect } from 'react';

/**
 * Some mobile browsers and translation/accessibility layers can mutate the DOM
 * after React has rendered it. React may then try to remove a node that has
 * already been moved, which throws NotFoundError/removeChild and crashes the
 * client. Keep this guard narrowly scoped to that browser DOM race.
 */
export function DomMutationGuard() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const key = '__41blogDomMutationGuard';
        if ((window as unknown as Record<string, unknown>)[key]) return;

        const proto = Node.prototype;
        const originalRemoveChild = proto.removeChild;
        const originalInsertBefore = proto.insertBefore;

        proto.removeChild = function <T extends Node>(child: T): T {
            if (child.parentNode !== this) {
                return child;
            }
            return originalRemoveChild.call(this, child) as T;
        };

        proto.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
            if (referenceNode !== null && referenceNode.parentNode !== this) {
                this.appendChild(newNode);
                return newNode;
            }
            return originalInsertBefore.call(this, newNode, referenceNode) as T;
        };

        (window as unknown as Record<string, unknown>)[key] = true;
    }, []);

    return null;
}
