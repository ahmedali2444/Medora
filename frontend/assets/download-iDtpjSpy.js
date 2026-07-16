import{c as t}from"./index-B5T7Rub2.js";/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],c=t("download",a);function r(o){if(!(o!=null&&o.blob))return;const e=window.URL.createObjectURL(o.blob),n=document.createElement("a");n.href=e,n.download=o.filename||"download",document.body.appendChild(n),n.click(),n.remove(),window.URL.revokeObjectURL(e)}export{c as D,r as t};
