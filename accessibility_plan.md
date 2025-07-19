# Accessibility Improvement Plan

## Overview
This document outlines the accessibility issues found in the Thought Eddies site and provides a prioritized plan for addressing them to meet WCAG 2.1 AA standards.

## Priority Levels
- 🔴 **Critical** - Blocks access to content or functionality
- 🟡 **Important** - Significantly impacts user experience
- 🟢 **Nice to have** - Enhances accessibility but not blocking

## Issues and Implementation Plan

### 🔴 Critical Issues

#### 1. Add Skip Navigation Link
**Issue**: Keyboard users must tab through all navigation items to reach main content
**Location**: `src/layouts/Layout.astro`
**Fix**:
```html
<!-- Add after <body> tag -->
<a href="#main-content" class="skip-link">Skip to main content</a>
<!-- Add id to main element -->
<main id="main-content">
```
**CSS**:
```css
.skip-link {
  position: absolute;
  left: -9999px;
  z-index: 999;
}
.skip-link:focus {
  left: 50%;
  transform: translateX(-50%);
  top: 1rem;
  padding: 0.5rem 1rem;
  background: var(--color-bg);
  border: 2px solid var(--color-accent);
}
```

#### 2. Implement Focus Indicators
**Issue**: No visible focus indicators for keyboard navigation
**Location**: `src/styles/global.css`
**Fix**:
```css
/* Add to global styles */
a:focus-visible,
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* For better contrast in dark mode */
@media (prefers-color-scheme: dark) {
  :focus-visible {
    outline-color: var(--color-accent-dark);
  }
}
```

#### 3. Fix Navigation ARIA Labels
**Issue**: Theme toggle and other buttons lack accessible labels
**Location**: `src/components/layout/Navigation.astro`
**Fix**:
```html
<!-- Theme toggle button -->
<button 
  id="theme-toggle" 
  class="nav-link nav-icon-link"
  aria-label="Toggle theme"
  aria-pressed="false"
>

<!-- Search button -->
<button 
  id="search-button" 
  class="nav-link nav-icon-link"
  aria-label="Search (⌘K)"
  aria-keyshortcuts="Cmd+K"
>

<!-- Add aria-current to selected nav item -->
<a 
  href={item.href} 
  class:list={["nav-link", { selected }]}
  aria-current={selected ? "page" : undefined}
>
```

#### 4. Fix Missing Alt Text in Chat Components
**Issue**: Chat images have empty alt attributes
**Location**: `src/components/prose/Chat.astro` and related components
**Fix**:
```html
<!-- Instead of empty alt -->
<img src={url} alt={`User uploaded image in ${name}'s message`} class="message-image" />
<!-- Or add a way to pass alt text through props -->
```

### 🟡 Important Issues

#### 5. Update Viewport Meta Tag
**Issue**: Missing initial-scale can cause issues on mobile
**Location**: `src/layouts/Layout.astro`
**Fix**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

#### 6. Add Form Labels
**Issue**: Search input and other form fields lack proper labels
**Location**: `src/components/SearchOverlay.tsx`
**Fix**:
```tsx
<input
  ref={inputRef}
  type="text"
  placeholder="Search site..."
  aria-label="Search site"
  className="search-input"
/>
```

#### 7. Implement Dialog Pattern for SearchOverlay
**Issue**: Modal lacks proper ARIA attributes and focus trap
**Location**: `src/components/SearchOverlay.tsx`
**Fix**:
```tsx
<div 
  className="search-overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Site search"
>
  {/* Implement focus trap */}
</div>
```

#### 8. Improve Color Contrast
**Issue**: Some color combinations may not meet WCAG AA standards
**Action**: 
- Test all color combinations with contrast checker
- Update CSS variables for insufficient contrast ratios
- Target minimum 4.5:1 for normal text, 3:1 for large text

#### 9. Increase Minimum Font Sizes
**Issue**: Some text uses 12px which is too small
**Location**: `src/styles/global.css`
**Fix**:
```css
:root {
  --text-xs: 0.875rem; /* 14px instead of 12px */
}
```

### 🟢 Nice to Have

#### 10. Add Reduced Motion Support
**Issue**: Animations don't respect user preferences
**Location**: Various components with animations
**Fix**:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### 11. Implement Lazy Loading for Images
**Issue**: No lazy loading for performance
**Fix**: Add `loading="lazy"` to img tags below the fold

#### 12. Add Loading States
**Issue**: No feedback for async operations
**Fix**: Add loading indicators with appropriate ARIA live regions

## Testing Checklist

### Manual Testing
- [ ] Navigate entire site using only keyboard
- [ ] Test with screen reader (NVDA/JAWS on Windows, VoiceOver on Mac)
- [ ] Check all interactive elements have visible focus
- [ ] Verify all images have appropriate alt text
- [ ] Test with browser zoom at 200%
- [ ] Check color contrast with analyzer tools

### Automated Testing
- [ ] Run axe DevTools on all page types
- [ ] Use Lighthouse accessibility audit
- [ ] Test with Pa11y CLI tool

### Device Testing
- [ ] Test on mobile devices with screen readers
- [ ] Test with keyboard-only navigation
- [ ] Test with voice control software

## Implementation Timeline

### Phase 1 (Week 1) - Critical Issues
- Skip navigation link
- Focus indicators
- Navigation ARIA labels
- Alt text fixes

### Phase 2 (Week 2) - Important Issues
- Form labels
- Dialog patterns
- Color contrast verification
- Font size adjustments

### Phase 3 (Week 3) - Enhancements
- Reduced motion support
- Performance optimizations
- Loading states
- Final testing and validation

## Success Metrics
- WCAG 2.1 AA compliance
- Lighthouse accessibility score > 95
- Zero critical issues in axe DevTools
- Successful screen reader testing
- Positive user feedback from accessibility testing

## Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe DevTools](https://www.deque.com/axe/devtools/)