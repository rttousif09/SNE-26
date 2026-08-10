var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// test-render.tsx
var import_server = require("react-dom/server");

// src/components/SAPSelect.tsx
var import_react = __toESM(require("react"), 1);
var import_lucide_react = require("lucide-react");
var import_react2 = require("motion/react");
var import_jsx_runtime = require("react/jsx-runtime");
function extractOptionsFromChildren(children) {
  const items = [];
  import_react.default.Children.forEach(children, (child) => {
    if (!import_react.default.isValidElement(child)) return;
    const element = child;
    if (element.type === "option") {
      const props = element.props || {};
      const val = props.value !== void 0 ? props.value : props.children;
      const rawLabel = typeof props.children === "string" ? props.children : String(props.children || val || "");
      let code = String(val);
      let description = rawLabel;
      const parenMatch = rawLabel.match(/^(.*?)\s*\((.*?)\)$/);
      const dashMatch = rawLabel.match(/^(.*?)\s*[-:]\s*(.*)$/);
      if (parenMatch) {
        description = parenMatch[1].trim();
        code = parenMatch[2].trim();
      } else if (dashMatch && dashMatch[1].length <= 12) {
        code = dashMatch[1].trim();
        description = dashMatch[2].trim();
      }
      items.push({
        value: val,
        label: rawLabel,
        code,
        description,
        disabled: props.disabled
      });
    } else if (element.type === import_react.default.Fragment) {
      items.push(...extractOptionsFromChildren(element.props?.children));
    } else if (element.type === "optgroup") {
      const props = element.props || {};
      items.push({
        value: "",
        label: props.label || "Group",
        code: "",
        description: props.label || "Group",
        disabled: true,
        isGroupLabel: true
      });
      items.push(...extractOptionsFromChildren(props.children));
    } else {
      items.push(...extractOptionsFromChildren(element.props?.children));
    }
  });
  return items;
}
var SAPSelect = ({
  children,
  value,
  onChange,
  className = "",
  disabled,
  required,
  name,
  id,
  placeholder,
  labelTitle,
  ...rest
}) => {
  const [isOpen, setIsOpen] = (0, import_react.useState)(false);
  const [searchTerm, setSearchTerm] = (0, import_react.useState)("");
  const [hoveredIdx, setHoveredIdx] = (0, import_react.useState)(null);
  const containerRef = (0, import_react.useRef)(null);
  const searchInputRef = (0, import_react.useRef)(null);
  const options = (0, import_react.useMemo)(() => extractOptionsFromChildren(children), [children]);
  const selectableOptions = (0, import_react.useMemo)(() => {
    return options.filter((o) => !o.isGroupLabel);
  }, [options]);
  const selectedOption = (0, import_react.useMemo)(() => {
    return options.find((o) => String(o.value) === String(value));
  }, [options, value]);
  const filteredOptions = (0, import_react.useMemo)(() => {
    if (!searchTerm.trim()) return selectableOptions;
    const term = searchTerm.toLowerCase();
    return selectableOptions.filter(
      (o) => String(o.value).toLowerCase().includes(term) || o.label.toLowerCase().includes(term) || o.code.toLowerCase().includes(term) || o.description.toLowerCase().includes(term)
    );
  }, [selectableOptions, searchTerm]);
  (0, import_react.useEffect)(() => {
    if (isOpen) {
      setSearchTerm("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);
  const handleSelect = (opt) => {
    if (opt.disabled || opt.isGroupLabel) return;
    if (onChange) {
      const syntheticEvent = {
        target: { value: opt.value, name, id },
        currentTarget: { value: opt.value, name, id }
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };
  const modalTitle = labelTitle || name || "Select Item / Value Help";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `relative inline-flex items-center w-full min-w-[120px]`, ref: containerRef, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "select",
      {
        className: "sr-only",
        value,
        onChange,
        disabled,
        required,
        name,
        id,
        tabIndex: -1,
        ...rest,
        children
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: `sap-input w-full flex items-center justify-between cursor-pointer select-none py-0.5 px-1.5 min-h-[24px] border border-[#8c9ba8] rounded-xs transition-colors ${disabled ? "bg-[#eef2f6] text-[#475569] cursor-not-allowed opacity-80" : "bg-white hover:border-[#0056b3]"} ${className}`,
        onClick: () => !disabled && setIsOpen(true),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `truncate text-[11px] font-sans ${selectedOption && selectedOption.value !== "" ? "text-gray-900 font-medium" : "text-gray-500 italic"}`, children: selectedOption ? selectedOption.label : placeholder || "-- Select --" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              tabIndex: -1,
              disabled,
              onClick: (e) => {
                e.stopPropagation();
                if (!disabled) setIsOpen(true);
              },
              className: "ml-1 px-1 py-0.5 bg-gradient-to-b from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border-l border-[#8c9ba8] text-gray-700 flex items-center justify-center rounded-r-xs shrink-0",
              title: "F4 Value Help",
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Search, { size: 11, className: "text-[#002f6c]" })
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.AnimatePresence, { children: isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4 select-none", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      import_react2.motion.div,
      {
        initial: { opacity: 0, scale: 0.96, y: -8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, y: -8 },
        transition: { duration: 0.15 },
        className: "bg-[#f0f4f8] border-2 border-[#002f6c] shadow-2xl rounded-xs w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-[11px] font-sans",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-gradient-to-b from-[#d2dfed] via-[#c8d7e6] to-[#b8ceea] border-b border-[#8c9ba8] px-3 py-1.5 flex items-center justify-between text-[#002f6c] font-bold text-xs shadow-xs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center space-x-2 truncate", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "bg-[#002f6c] text-white text-[9px] px-1 py-0.2 rounded-xs font-mono font-semibold", children: "F4 Help" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "truncate", children: modalTitle }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-[10px] text-[#003b82] font-normal border-l border-[#8c9ba8] pl-2", children: [
                selectableOptions.length,
                " Entries Found"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: () => setIsOpen(false),
                className: "text-[#002f6c] hover:bg-red-600 hover:text-white p-0.5 rounded-xs transition-colors",
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.X, { size: 14 })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-gradient-to-b from-[#f4f7fa] to-[#e8eef4] border-b border-[#8c9ba8] p-2 flex flex-col space-y-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center space-x-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-[10px] font-bold text-[#002f6c] uppercase tracking-wider flex items-center gap-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Filter, { size: 11 }),
              " Restrictions / Find:"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative flex-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  ref: searchInputRef,
                  type: "text",
                  className: "sap-input w-full pl-6 pr-2 py-1 text-[11px] bg-white border border-[#8c9ba8] focus:bg-[#fffde7] focus:border-[#d97706] rounded-xs shadow-inner",
                  placeholder: "Type to filter list...",
                  value: searchTerm,
                  onChange: (e) => setSearchTerm(e.target.value),
                  onKeyDown: (e) => {
                    if (e.key === "Escape") setIsOpen(false);
                    if (e.key === "Enter" && filteredOptions.length > 0) {
                      handleSelect(filteredOptions[0]);
                    }
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_lucide_react.Search,
                {
                  size: 12,
                  className: "absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500"
                }
              )
            ] }),
            searchTerm && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: () => setSearchTerm(""),
                className: "text-xs text-gray-500 hover:text-gray-800 px-1 font-semibold",
                children: "Clear"
              }
            )
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 overflow-auto bg-white p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left border-collapse border border-[#cbd5e1]", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "bg-gradient-to-b from-[#e2e8f0] to-[#cbd5e1] text-[#002f6c] font-bold border-b border-[#8c9ba8] sticky top-0 z-10 text-[10px] uppercase", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-1.5 border-r border-[#cbd5e1] w-12 text-center", children: "#" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-1.5 border-r border-[#cbd5e1] w-28", children: "Key / Code" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-1.5", children: "Description / Name" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-1.5 w-12 text-center", children: "Select" })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filteredOptions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { colSpan: 4, className: "p-6 text-center text-gray-500 italic", children: [
              'No matching records found for "',
              searchTerm,
              '"'
            ] }) }) : filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "tr",
                {
                  onMouseEnter: () => setHoveredIdx(idx),
                  onMouseLeave: () => setHoveredIdx(null),
                  onClick: () => handleSelect(opt),
                  className: `cursor-pointer border-b border-gray-200 transition-colors ${isSelected ? "bg-[#d2dfed] font-bold text-[#002f6c] border-l-4 border-l-[#0056b3]" : hoveredIdx === idx ? "bg-[#fffde7] text-gray-900 border-l-4 border-l-[#d97706]" : idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}`,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1.5 border-r border-gray-200 text-center text-gray-500 font-mono text-[10px]", children: idx + 1 }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1.5 border-r border-gray-200 font-mono font-semibold text-gray-700 truncate max-w-[110px]", children: opt.code || opt.value || "-" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1.5 font-medium text-gray-900 truncate", children: opt.description || opt.label }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1.5 text-center", children: isSelected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-flex items-center justify-center bg-[#0056b3] text-white rounded-full p-0.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Check, { size: 10 }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-[#0056b3] hover:underline font-bold", children: "Choose" }) })
                  ]
                },
                idx
              );
            }) })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-gradient-to-b from-[#e2e8f0] to-[#cbd5e1] border-t border-[#8c9ba8] px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-700", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex items-center space-x-2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "font-semibold text-[#002f6c]", children: [
              "Showing ",
              filteredOptions.length,
              " of ",
              selectableOptions.length,
              " entries"
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex space-x-2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: () => setIsOpen(false),
                className: "sap-btn bg-white border border-gray-400 text-gray-700 px-3 py-0.5 hover:bg-gray-100 rounded-xs",
                children: "Cancel"
              }
            ) })
          ] })
        ]
      }
    ) }) })
  ] });
};

// test-render.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
console.log((0, import_server.renderToStaticMarkup)(/* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SAPSelect, { value: "1", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "1", children: "One" }) })));
