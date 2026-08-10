import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SAPSelect } from './src/components/SAPSelect';

console.log(renderToStaticMarkup(<SAPSelect value="1"><option value="1">One</option></SAPSelect>));
