'use client';

type WindowWithGuard = Window & {
    __41blogDomMutationGuard?: boolean;
};

/**
 * Protect React from DOM nodes moved/removed by browser translation,
 * accessibility layers, WebViews or other external DOM mutators.
 *
 * Install during module evaluation so the protection is active before
 * React hydration begins. Installing in useEffect is too late for an
 * initial hydration error.
 */
function installDomMutationGuard() {
    if (typeof window === 'undefined') return;
    if ((window as WindowWithGuard).__41blogDomMutationGuard) return;

    const proto = Node.prototype;
    const originalRemoveChild = proto.removeChild;
    const originalInsertBefore = proto.insertBefore;

    proto.removeChild = function <T extends Node>(child: T): T {
        if (child.parentNode !== this) {
            return child;
        }
        return originalRemoveChild.call(this, child) as T;
    };

    proto.insertBefore = function <T extends Node>(
        newNode: T,
        referenceNode: Node | null
    ): T {
        if (referenceNode !== null && referenceNode.parentNode !== this) {
            this.appendChild(newNode);
            return newNode;
        }
        return originalInsertBefore.call(this, newNode, referenceNode) as T;
    };

    (window as WindowWithGuard).__41blogDomMutationGuard = true;
}

installDomMutationGuard();

export function DomMutationGuard() {
    return null;
}
