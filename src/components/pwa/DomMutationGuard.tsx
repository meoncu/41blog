'use client';

type WindowWithGuard = Window & {
    __41blogDomMutationGuard?: boolean;
};

/**
 * React can crash with NotFoundError/removeChild when another browser layer
 * (translation, accessibility, WebView/PWA tooling, etc.) moves a DOM node
 * between React's render and commit phases.
 *
 * IMPORTANT: install the guard at module evaluation time, not in useEffect.
 * useEffect runs after hydration, so an initial hydration error could happen
 * before the old guard was installed.
 */
function installDomMutationGuard() {
    if (typeof window === 'undefined') return;
    if ((window as WindowWithGuard).__41blogDomMutationGuard) return;

    const proto = Node.prototype;
    const originalRemoveChild = proto.removeChild;
    const originalInsertBefore = proto.insertBefore;

    proto.removeChild = function <T extends Node>(child: T): T {
        // React asks to remove a node that an external DOM mutator has
        // already moved/removed. Treat that operation as already completed.
        if (child.parentNode !== this) {
            return child;
        }

        return originalRemoveChild.call(this, child) as T;
    };

    proto.insertBefore = function <T extends Node>(
        newNode: T,
        referenceNode: Node | null
    ): T {
        // If the reference node was moved outside this parent, append instead
        // of throwing NotFoundError. This keeps React's commit phase alive.
        if (referenceNode !== null && referenceNode.parentNode !== this) {
            this.appendChild(newNode);
            return newNode;
        }

        return originalInsertBefore.call(this, newNode, referenceNode) as T;
    };

    (window as WindowWithGuard).__41blogDomMutationGuard = true;
}

// Run before React hydration/effects.
installDomMutationGuard();

export function DomMutationGuard() {
    return null;
}
