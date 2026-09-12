import searchIcon from '../../assets/library/search-icon.svg'
import filterIcon from '../../assets/library/filter-icon.svg'
import sortIcon from '../../assets/library/sort-icon.svg'
import { Button } from '../../components/ui/Button'
import { templateFontFamily, templateSortLabels, templateSortOptions } from './templateLibraryModel'
import type { TemplateLibrarySession } from './useTemplateLibrary'

export function TemplateLibraryToolbar({ session }: { session: TemplateLibrarySession }) {
  const {
    searchQuery,
    selectedCategories,
    sortOption,
    filtersOpen,
    sortOpen,
    categories,
    refs,
    actions,
  } = session

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '1px solid #EDEDED',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: '334px',
              height: '32px',
              backgroundColor: '#F7F7F7',
              borderRadius: '8px',
              padding: '0 10px',
            }}
          >
            <img
              src={searchIcon}
              alt=""
              style={{ width: '17px', height: '17px', transform: 'scaleX(-1)' }}
            />
            <input
              aria-label="Search templates"
              data-global-search
              type="text"
              value={searchQuery}
              onChange={(event) => actions.setSearchQuery(event.target.value)}
              placeholder="Search templates..."
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '14px',
                fontWeight: 510,
                color: '#454545',
                letterSpacing: '-0.7px',
                lineHeight: '16px',
                outline: 'none',
                fontFamily: templateFontFamily,
              }}
            />
          </div>

          {categories.length > 0 && (
            <Button
              aria-expanded={filtersOpen}
              aria-controls="template-category-filters"
              onClick={actions.toggleFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '32px',
                padding: '6px 10px',
                backgroundColor:
                  filtersOpen || selectedCategories.length > 0 ? '#F0F0F0' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                fontFamily: templateFontFamily,
                transition: 'background-color 0.15s ease',
              }}
            >
              <img src={filterIcon} alt="" style={{ width: '16px', height: '16px' }} />
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#454545',
                  letterSpacing: '-0.8px',
                  lineHeight: '21px',
                }}
              >
                Filters{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ''}
              </span>
            </Button>
          )}

          <div ref={refs.sortRef} style={{ position: 'relative' }}>
            <Button
              ref={refs.sortButtonRef}
              aria-expanded={sortOpen}
              aria-haspopup="menu"
              aria-controls={sortOpen ? 'template-sort-menu' : undefined}
              onClick={actions.toggleSort}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '32px',
                padding: '6px 10px',
                backgroundColor: sortOpen ? '#F0F0F0' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                fontFamily: templateFontFamily,
                transition: 'background-color 0.15s ease',
              }}
            >
              <img src={sortIcon} alt="" style={{ width: '16px', height: '16px' }} />
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#454545',
                  letterSpacing: '-0.8px',
                  lineHeight: '21px',
                }}
              >
                Sort: <span style={{ fontWeight: 510 }}>{templateSortLabels[sortOption]}</span>
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  marginLeft: '2px',
                  transform: sortOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="#454545"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
            {sortOpen && (
              <div
                ref={refs.sortMenuRef}
                id="template-sort-menu"
                role="menu"
                aria-label="Sort templates"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  border: '1px solid #EDEDED',
                  padding: '8px 0',
                  minWidth: '140px',
                  zIndex: 100,
                }}
              >
                {templateSortOptions.map((option) => (
                  <Button
                    key={option.key}
                    role="menuitemradio"
                    aria-checked={sortOption === option.key}
                    onClick={() => actions.setSort(option.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      backgroundColor: sortOption === option.key ? '#F7F7F7' : 'transparent',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = '#F7F7F7'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor =
                        sortOption === option.key ? '#F7F7F7' : 'transparent'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: sortOption === option.key ? 510 : 400,
                        color: sortOption === option.key ? '#7C3AED' : '#454545',
                      }}
                    >
                      {option.label}
                    </span>
                    {sortOption === option.key && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ marginLeft: 'auto' }}
                      >
                        <path
                          d="M2.5 7L5.5 10L11.5 4"
                          stroke="#7C3AED"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {filtersOpen && categories.length > 0 && (
        <div
          id="template-category-filters"
          aria-label="Template categories"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '50px',
            padding: '0 20px',
            borderBottom: '1px solid #EDEDED',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'auto' }}>
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.id)
              return (
                <Button
                  key={category.id}
                  aria-pressed={isSelected}
                  onClick={() => actions.toggleCategory(category.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px',
                    backgroundColor: isSelected ? '#F7F7F7' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: templateFontFamily,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 510,
                      color: '#454545',
                      letterSpacing: '-0.7px',
                      lineHeight: '16px',
                    }}
                  >
                    {category.label}
                  </span>
                </Button>
              )
            })}
          </div>

          <Button
            onClick={actions.clearCategories}
            disabled={selectedCategories.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: templateFontFamily,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 510,
                color: '#338CE4',
                letterSpacing: '-0.7px',
                lineHeight: '16px',
              }}
            >
              Clear all
            </span>
          </Button>
        </div>
      )}
    </>
  )
}
