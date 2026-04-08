function buildTextComponent(id, value) {
  return {
    Text: {
      id,
      text: value
    }
  };
}

function buildButtonComponent(id, label) {
  return {
    Button: {
      id,
      label
    }
  };
}

function buildCard(cardIndex, variant) {
  const prefix = `card-${cardIndex}`;
  return {
    Container: {
      id: `${prefix}-shell`,
      layout: 'vertical',
      components: [
        buildTextComponent(`${prefix}-title`, `Card ${cardIndex} ${variant}`),
        buildTextComponent(`${prefix}-body`, `Body ${cardIndex} ${variant}`),
        buildButtonComponent(`${prefix}-action-primary`, `Open ${cardIndex}`),
        buildButtonComponent(`${prefix}-action-secondary`, `Archive ${cardIndex}`)
      ]
    }
  };
}

function buildDashboardCards(count, variant, offset = 0) {
  return Array.from({ length: count }, (_, index) => buildCard(index + offset, variant));
}

function buildDenseSiblingComponents(count, variant) {
  return Array.from({ length: count }, (_, index) => {
    const id = `row-${index}`;
    if (index % 3 === 0) {
      return buildTextComponent(`${id}-text`, `Row ${index} ${variant}`);
    }
    if (index % 3 === 1) {
      return buildButtonComponent(`${id}-button`, `Action ${index} ${variant}`);
    }
    return {
      Container: {
        id: `${id}-container`,
        layout: 'horizontal',
        components: [
          buildTextComponent(`${id}-headline`, `Headline ${index} ${variant}`),
          buildButtonComponent(`${id}-cta`, `CTA ${index}`)
        ]
      }
    };
  });
}

function buildNestedDashboardScenario(variant) {
  return {
    page: {
      id: 'benchmark-dashboard',
      title: `Benchmark Dashboard ${variant}`,
      layout: 'vertical',
      components: [
        {
          Container: {
            id: 'hero-shell',
            layout: 'vertical',
            components: [
              buildTextComponent('hero-title', `Hero ${variant}`),
              buildTextComponent('hero-summary', `Summary ${variant}`)
            ]
          }
        },
        {
          Container: {
            id: 'cards-shell',
            layout: 'vertical',
            components: buildDashboardCards(32, variant)
          }
        }
      ]
    }
  };
}

function buildDenseSiblingScenario(variant) {
  return {
    page: {
      id: 'benchmark-siblings',
      title: `Benchmark Siblings ${variant}`,
      layout: 'vertical',
      components: [
        ...buildDenseSiblingComponents(120, variant),
        {
          Container: {
            id: 'footer-shell',
            layout: 'horizontal',
            components: [
              buildTextComponent('footer-copy', `Footer ${variant}`),
              buildButtonComponent('footer-cta', `Save ${variant}`)
            ]
          }
        }
      ]
    }
  };
}

function countComponents(components) {
  return components.reduce((count, component) => {
    const [kind, payload] = Object.entries(component)[0];
    const nested = payload && Array.isArray(payload.components) ? countComponents(payload.components) : 0;
    return count + 1 + nested;
  }, 0);
}

module.exports = {
  buildNestedDashboardScenario,
  buildDenseSiblingScenario,
  countScenarioComponents(dsl) {
    return countComponents(dsl.page.components || []);
  }
};
