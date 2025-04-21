# Technical Resources for Summer EBT Mailing Address Validation

This repository contains technical resources supporting the [Best Practices for Summer EBT Mailing Address Validation]() guide:
1. [Demo application](/demo-application/README.md) for address autocomplete and validation, using the [Smarty](https://smarty.com) APIs. This sample can function as a starting point for improving address quality collected in a Summer EBT application form or self-service portal.
2. [Samples](/data-pipeline-samples/README.md) for using [libpostal](https://github.com/openvenues/libpostal) in a backend data-pipeline for bulk validation of a large address dataset (e.g., address for people eligible via streamline certification). These samples use [pypostal](https://github.com/openvenues/pypostal), the Python language binding for libpostal and are presented as a [Jupyter notebook](https://jupyter.org/).
