import plotly.express as px
from typing import List
import pandas as pd


def plot_genre_country_treemap(
        df_aggregated: pd.DataFrame,
        top_countries: List[str],
        color_scale: str = 'Blues',
        title: str = "Numero medio di attori per Genere e Nazione",
        margin: dict = dict(t=50, l=25, r=25, b=25),
        font_size: int = 14
) -> None:
    """
    Crea una treemap interattiva per visualizzare il numero medio di attori per genere e nazione.

    Args:
        df_aggregated: DataFrame contenente:
                      - 'genre_label': etichette dei generi con durata media
                      - 'country_label': etichette delle nazioni
                      - 'num_actors': valori per dimensione/colore dei rettangoli
                      - 'minute': durata media (per tooltip)
        top_countries: Lista delle nazioni incluse (per riferimento)
        color_scale: Scala di colori (default: 'Blues')
        title: Titolo del grafico
        margin: Margini del grafico
        font_size: Dimensione del font
    """
    fig = px.treemap(
        df_aggregated,
        path=['genre_label', 'country_label'],
        values='num_actors',
        color='num_actors',
        color_continuous_scale=color_scale,
        title=title,
        labels={'num_actors': 'Numero medio di attori', 'minute': 'Durata media (min)'},
        hover_data={'num_actors': ':.1f', 'minute': ':.1f'},
    )

    fig.update_layout(
        margin=margin,
        font=dict(size=font_size)
    )

    fig.update_traces(
        texttemplate='%{label}',
        textposition='middle center'
    )

    fig.show()