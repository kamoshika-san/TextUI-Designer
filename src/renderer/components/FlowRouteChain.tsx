import React from 'react';
import type { NavigationRouteChain } from '../../shared/navigation-graph';
import { MAX_NAVIGATION_ROUTES } from '../../shared/navigation-graph';

interface FlowRouteChainProps {
  routes: NavigationRouteChain[];
  screenTitleMap: Map<string, string>;
  totalRouteCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const FlowRouteChain: React.FC<FlowRouteChainProps> = ({
  routes,
  screenTitleMap,
  totalRouteCount,
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (routes.length === 0) {
    return (
      <div className="textui-flow-route-chain-empty">
        No route from entry
      </div>
    );
  }

  const pageOffset = currentPage * MAX_NAVIGATION_ROUTES;

  return (
    <div className="textui-flow-route-chains">
      {routes.map((route, routeIndex) => (
        <div key={routeIndex} className="textui-flow-route-chain">
          <div className="textui-flow-route-chain-heading">
            {`Route ${pageOffset + routeIndex + 1}`}
            <span className="textui-flow-route-chain-steps">
              {`(${route.length} step${route.length !== 1 ? 's' : ''})`}
            </span>
          </div>
          <div className="textui-flow-route-chain-path">
            {route.screenIds.map((screenId, screenIndex) => (
              <React.Fragment key={`${screenId}-${screenIndex}`}>
                <span className="textui-flow-route-chain-screen">
                  {screenTitleMap.get(screenId) ?? screenId}
                </span>
                {screenIndex < route.screenIds.length - 1 ? (
                  <span className="textui-flow-route-chain-arrow" aria-hidden="true">→</span>
                ) : null}
              </React.Fragment>
            ))}
          </div>
          {route.triggers.length > 0 ? (
            <div className="textui-flow-route-chain-triggers">
              {route.triggers.map((trigger, triggerIndex) => (
                <React.Fragment key={`${trigger}-${triggerIndex}`}>
                  <span className="textui-flow-route-chain-trigger">{trigger}</span>
                  {triggerIndex < route.triggers.length - 1 ? (
                    <span className="textui-flow-route-chain-trigger-sep" aria-hidden="true">/</span>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          ) : null}
        </div>
      ))}
      {totalPages > 1 ? (
        <div className="textui-flow-route-chain-pagination">
          <button
            type="button"
            className="textui-flow-route-chain-page-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            aria-label="Previous page"
          >
            ‹ Prev
          </button>
          <span className="textui-flow-route-chain-page-info">
            {`${currentPage + 1} / ${totalPages}`}
            <span className="textui-flow-route-chain-page-total">
              {` (${totalRouteCount} routes)`}
            </span>
          </span>
          <button
            type="button"
            className="textui-flow-route-chain-page-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            aria-label="Next page"
          >
            Next ›
          </button>
        </div>
      ) : null}
    </div>
  );
};

export { MAX_NAVIGATION_ROUTES };
