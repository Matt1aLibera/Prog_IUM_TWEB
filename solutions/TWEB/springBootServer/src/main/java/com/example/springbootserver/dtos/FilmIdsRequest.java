package com.example.springbootserver.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.ArraySchema;

import java.util.List;
@Schema(
        name = "FilmIdsRequest",
        description = "Request object containing a list of movie IDs for batch operations"
)
public class FilmIdsRequest {
    @ArraySchema(
            schema = @Schema(
                    type = "integer",
                    format = "int64",
                    description = "Unique movie identifier"//,
                    //example = "123"
            ),
            minItems = 1,
            arraySchema = @Schema(
                    description = "List of movie IDs to process",
                    requiredMode = Schema.RequiredMode.REQUIRED//,
                   // example = "[1, 2, 3]"
            )
    )
    private List<Long> ids;

    public FilmIdsRequest() {}

    public List<Long> getIds() {
        return ids;
    }

    public void setIds(List<Long> ids) {
        this.ids = ids;
    }
}