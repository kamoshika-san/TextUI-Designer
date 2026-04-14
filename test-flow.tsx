// generated: router.tsx
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { CartPage } from './App';
import { ShippingPage } from './App';
import { ConfirmPage } from './App';

export const router = createBrowserRouter([
  { path: '/', element: <CartPage />, handle: { screenId: 'cart', kind: 'screen', terminalKind: undefined } },
  { path: '/screens/shipping', element: <ShippingPage />, handle: { screenId: 'shipping', kind: 'screen', terminalKind: undefined } },
  { path: '/screens/confirm', element: <ConfirmPage />, handle: { screenId: 'confirm', kind: 'screen', terminalKind: undefined } }
]);

// generated: App.tsx
import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

export function App() {
  return <RouterProvider router={router} />;
}

export const flowMetadata = {
  id: 'checkout-flow',
  title: 'Checkout Flow',
  entry: 'cart',
  version: '1',
  loopPolicy: 'deny',
  terminalScreensRequired: false,
  transitions: [
  {
    "from": "cart",
    "to": "shipping",
    "trigger": "next"
  },
  {
    "from": "shipping",
    "to": "confirm",
    "trigger": "next"
  },
  {
    "from": "confirm",
    "to": "done",
    "trigger": "submit"
  }
]
};

export function CartPage() {
  return (
    <main className="textui-flow-screen" data-screen-id="cart" data-screen-kind="screen">
      <h1>Cart</h1>
      <p>Screen ID: cart</p>
      <p>Route: /</p>
      <p>Screen Kind: screen</p>
      <p>Outgoing Transitions: cart::next::shipping</p>
    </main>
  );
}

export function ShippingPage() {
  return (
    <main className="textui-flow-screen" data-screen-id="shipping" data-screen-kind="screen">
      <h1>Shipping</h1>
      <p>Screen ID: shipping</p>
      <p>Route: /screens/shipping</p>
      <p>Screen Kind: screen</p>
      <p>Outgoing Transitions: shipping::next::confirm</p>
    </main>
  );
}

export function ConfirmPage() {
  return (
    <main className="textui-flow-screen" data-screen-id="confirm" data-screen-kind="screen">
      <h1>Confirm</h1>
      <p>Screen ID: confirm</p>
      <p>Route: /screens/confirm</p>
      <p>Screen Kind: screen</p>
      <p>Outgoing Transitions: confirm::submit::done</p>
    </main>
  );
}